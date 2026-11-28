use sqlx::{Row, SqlitePool};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};

use crate::models::metadata_studio::{MetadataStudioData, MetadataStudioImage, MetadataStudioItem};

use crate::models::metadata_studio::MetadataStudioUpdate;

pub async fn get_metadata_studio_data(pool: &SqlitePool) -> AppResult<MetadataStudioData> {
    let rows = sqlx::query(
        r#"
        SELECT
            si.id,
            si.name,
            si.category,
            si.title,
            si.description,
            si.keywords_json,
            si.image_prompt,
            si.created_at,

            a.id AS asset_id,

            (
                SELECT af.storage_path
                FROM asset_files af
                WHERE af.asset_id = a.id
                  AND af.file_type IN ('original', 'preview')
                ORDER BY
                    CASE af.file_type
                        WHEN 'preview' THEN 0
                        ELSE 1
                    END
                LIMIT 1
            ) AS image_path,

            COALESCE(
                (
                    SELECT j.status
                    FROM jobs j
                    WHERE j.asset_id = a.id
                      AND j.job_type = 'other'
                      AND json_extract(j.payload_json, '$.task') = 'generate_image'
                    ORDER BY j.created_at DESC
                    LIMIT 1
                ),
                'not_started'
            ) AS image_generation_status,

            COALESCE(a.is_selected, 0) AS is_selected,
            a.status AS asset_status,
            a.created_at AS asset_created_at

        FROM stock_ideas si

        LEFT JOIN assets a
            ON a.stock_idea_id = si.id
            AND a.source_type != 'manual'
            AND a.deleted_at IS NULL
            AND a.is_archived = 0
            AND a.status != 'published'
            AND a.submission_status != 'published'

        WHERE NOT EXISTS (
            SELECT 1
            FROM assets published_asset
            WHERE published_asset.stock_idea_id = si.id
              AND (
                  published_asset.status = 'published'
                  OR published_asset.submission_status = 'published'
              )
        )

        ORDER BY si.created_at DESC, a.created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut items: Vec<MetadataStudioItem> = Vec::new();
    let mut item_indices: HashMap<String, usize> = HashMap::new();

    for row in rows {
        let idea_id: String = row.try_get("id")?;

        let index = if let Some(index) = item_indices.get(&idea_id) {
            *index
        } else {
            let keywords_json: String = row.try_get("keywords_json")?;

            let item = MetadataStudioItem {
                id: idea_id.clone(),
                name: row.try_get("name")?,
                source: "generated".to_string(),
                category: row.try_get("category")?,
                title: row.try_get("title")?,
                description: row.try_get("description")?,
                keywords: serde_json::from_str(&keywords_json)?,
                image_prompt: row.try_get("image_prompt")?,
                images: Vec::new(),
                created_at: row.try_get("created_at")?,
            };

            let index = items.len();

            items.push(item);
            item_indices.insert(idea_id.clone(), index);

            index
        };

        let asset_id: Option<String> = row.try_get("asset_id")?;

        if let Some(asset_id) = asset_id {
            let image: MetadataStudioImage = MetadataStudioImage {
                asset_id,
                image_path: row.try_get("image_path")?,
                image_generation_status: row.try_get("image_generation_status")?,
                is_selected: row.try_get::<i64, _>("is_selected")? != 0,
                status: row.try_get("asset_status")?,
                created_at: row.try_get("asset_created_at")?,
            };

            items[index].images.push(image);
        }
    }
    let manual_rows = sqlx::query(
        r#"
    SELECT
        a.id AS asset_id,
        a.original_filename,
        a.display_name,
        a.status AS asset_status,
        a.is_selected,
        a.created_at AS asset_created_at,

        COALESCE(mr.category, b.category, 'Uncategorized') AS category,
        COALESCE(mr.title, a.display_name, a.original_filename) AS title,
        COALESCE(mr.description, '') AS description,

        COALESCE(
            (
                SELECT json_group_array(keyword)
                FROM (
                    SELECT keyword
                    FROM metadata_keywords
                    WHERE metadata_revision_id = mr.id
                    ORDER BY position
                )
            ),
            '[]'
        ) AS keywords_json,

        (
            SELECT af.storage_path
            FROM asset_files af
            WHERE af.asset_id = a.id
              AND af.file_type IN ('original', 'preview')
            ORDER BY
                CASE af.file_type
                    WHEN 'preview' THEN 0
                    ELSE 1
                END
            LIMIT 1
        ) AS image_path

    FROM assets a

    LEFT JOIN batches b
        ON b.id = a.batch_id

    LEFT JOIN metadata_revisions mr
        ON mr.asset_id = a.id
        AND mr.is_current = 1

    WHERE a.source_type = 'manual'
      AND a.deleted_at IS NULL
      AND a.is_archived = 0
      AND a.status != 'published'
      AND a.submission_status != 'published'

    ORDER BY a.created_at DESC
    "#,
    )
    .fetch_all(pool)
    .await?;

    for row in manual_rows {
        let keywords_json: String = row.try_get("keywords_json")?;

        let item = MetadataStudioItem {
            id: row.try_get("asset_id")?,
            source: "manual".to_string(),
            name: row
                .try_get::<Option<String>, _>("display_name")?
                .unwrap_or(row.try_get("original_filename")?),
            category: row.try_get("category")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            keywords: serde_json::from_str(&keywords_json)?,
            image_prompt: String::new(),
            images: vec![MetadataStudioImage {
                asset_id: row.try_get("asset_id")?,
                image_path: row.try_get("image_path")?,
                image_generation_status: "not_started".to_string(),
                is_selected: row.try_get::<i64, _>("is_selected")? != 0,
                status: row.try_get("asset_status")?,
                created_at: row.try_get("asset_created_at")?,
            }],
            created_at: row.try_get("asset_created_at")?,
        };

        items.push(item);
    }
    let total = items.len() as i64;

    let missing_images = items
        .iter()
        .filter(|item| !item.images.iter().any(|image| image.image_path.is_some()))
        .count() as i64;

    let images_ready = items
        .iter()
        .filter(|item| item.images.iter().any(|image| image.image_path.is_some()))
        .count() as i64;

    Ok(MetadataStudioData {
        items,
        total,
        missing_images,
        images_ready,
    })
}

pub async fn import_manual_image(
    pool: &SqlitePool,
    stock_idea_id: &str,
    source_path: &str,
) -> AppResult<String> {
    let source = Path::new(source_path);

    if !source.is_file() {
        return Err(AppError::InvalidInput(
            "The selected image file does not exist.".into(),
        ));
    }

    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| AppError::InvalidInput("Invalid image extension.".into()))?;

    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "tif" | "tiff" => "image/tiff",
        _ => {
            return Err(AppError::InvalidInput(
                "Supported formats: JPG, PNG, WebP and TIFF.".into(),
            ));
        }
    };

    let metadata = std::fs::metadata(source)?;

    if metadata.len() == 0 || metadata.len() > 100 * 1024 * 1024 {
        return Err(AppError::InvalidInput(
            "Image must be larger than 0 bytes and no larger than 100 MB.".into(),
        ));
    }

    // Verify the stock idea exists.
    let idea_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM stock_ideas WHERE id = ?)")
            .bind(stock_idea_id)
            .fetch_one(pool)
            .await?;

    if !idea_exists {
        return Err(AppError::InvalidInput("Stock idea not found.".into()));
    }

    // Read the configured asset storage directory.
    let preferences: Option<String> =
        sqlx::query_scalar("SELECT value_json FROM app_settings WHERE key = 'app.preferences'")
            .fetch_optional(pool)
            .await?;

    let preferences = preferences.ok_or_else(|| {
        AppError::InvalidInput("Storage preferences have not been configured.".into())
    })?;

    let preferences: serde_json::Value = serde_json::from_str(&preferences)?;

    let storage_path = preferences["storagePath"]
        .as_str()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            AppError::InvalidInput("Please configure the asset storage path in Settings.".into())
        })?;

    let storage_root = PathBuf::from(storage_path);

    let asset_id = Uuid::new_v4().to_string();
    let file_id = Uuid::new_v4().to_string();

    let original_filename = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("image")
        .to_string();

    let destination_dir = storage_root.join("originals").join(stock_idea_id);

    std::fs::create_dir_all(&destination_dir)?;

    let destination = destination_dir.join(format!("{asset_id}.{extension}"));

    // Copy the image before committing database records.
    std::fs::copy(source, &destination)?;

    let result = async {
        let mut transaction = pool.begin().await?;

        let already_selected: bool = sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM assets
                WHERE stock_idea_id = ? AND is_selected = 1
                  AND deleted_at IS NULL AND is_archived = 0
            )",
        )
        .bind(stock_idea_id)
        .fetch_one(&mut *transaction)
        .await?;

        let is_selected = !already_selected;

        sqlx::query(
            r#"
            INSERT INTO assets (
                id,
                original_filename,
                status,
                source_type,
                created_at,
                updated_at,
                stock_idea_id,
                is_selected
            )
            VALUES (?, ?, 'imported', 'manual', datetime('now'),
                    datetime('now'), ?, ?)
            "#,
        )
        .bind(&asset_id)
        .bind(&original_filename)
        .bind(stock_idea_id)
        .bind(is_selected)
        .execute(&mut *transaction)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO asset_files (
                id,
                asset_id,
                file_type,
                storage_path,
                filename,
                mime_type,
                file_size,
                created_at
            )
            VALUES (?, ?, 'original', ?, ?, ?, ?, datetime('now'))
            "#,
        )
        .bind(&file_id)
        .bind(&asset_id)
        .bind(destination.to_string_lossy().to_string())
        .bind(format!("{asset_id}.{extension}"))
        .bind(mime_type)
        .bind(metadata.len() as i64)
        .execute(&mut *transaction)
        .await?;

        transaction.commit().await?;

        Ok::<(), sqlx::Error>(())
    }
    .await;

    if let Err(error) = result {
        let _ = std::fs::remove_file(&destination);
        return Err(AppError::Database(error));
    }

    Ok(asset_id)
}

pub async fn save_metadata_studio_item(
    pool: &SqlitePool,
    input: MetadataStudioUpdate,
) -> AppResult<()> {
    let name = input.name.trim();
    let category = input.category.trim();
    let title = input.title.trim();
    let description = input.description.trim();
    let image_prompt = input.image_prompt.trim();

    if name.is_empty() {
        return Err(AppError::InvalidInput("Asset name cannot be empty.".into()));
    }

    if category.is_empty() {
        return Err(AppError::InvalidInput("Category cannot be empty.".into()));
    }

    if title.is_empty() {
        return Err(AppError::InvalidInput("Title cannot be empty.".into()));
    }

    let keywords: Vec<String> = input
        .keywords
        .into_iter()
        .map(|keyword| keyword.trim().to_string())
        .filter(|keyword| !keyword.is_empty())
        .collect();

    if keywords.len() > 50 {
        return Err(AppError::InvalidInput(
            "A maximum of 50 keywords is allowed.".into(),
        ));
    }

    let mut transaction = pool.begin().await?;

    match input.source.as_str() {
        "generated" => {
            let keywords_json = serde_json::to_string(&keywords)?;

            let result = sqlx::query(
                r#"
                UPDATE stock_ideas
                SET
                    name = ?,
                    category = ?,
                    title = ?,
                    description = ?,
                    keywords_json = ?,
                    image_prompt = ?
                WHERE id = ?
                "#,
            )
            .bind(name)
            .bind(category)
            .bind(title)
            .bind(description)
            .bind(keywords_json)
            .bind(image_prompt)
            .bind(&input.id)
            .execute(&mut *transaction)
            .await?;

            if result.rows_affected() == 0 {
                return Err(AppError::InvalidInput(
                    "Generated stock idea not found.".into(),
                ));
            }
        }

        "manual" => {
            let asset_exists: bool = sqlx::query_scalar(
                r#"
                SELECT EXISTS(
                    SELECT 1
                    FROM assets
                    WHERE id = ?
                      AND source_type = 'manual'
                      AND deleted_at IS NULL
                      AND is_archived = 0
                      AND status != 'published'
                      AND submission_status != 'published'
                )
                "#,
            )
            .bind(&input.id)
            .fetch_one(&mut *transaction)
            .await?;

            if !asset_exists {
                return Err(AppError::InvalidInput(
                    "Manual asset not found or is no longer editable.".into(),
                ));
            }

            sqlx::query(
                r#"
                UPDATE assets
                SET
                    display_name = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(name)
            .bind(&input.id)
            .execute(&mut *transaction)
            .await?;

            let revision_number: i64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(MAX(revision_number), 0) + 1
                FROM metadata_revisions
                WHERE asset_id = ?
                "#,
            )
            .bind(&input.id)
            .fetch_one(&mut *transaction)
            .await?;

            // Preserve the previous revision as history.
            sqlx::query(
                r#"
                UPDATE metadata_revisions
                SET is_current = 0
                WHERE asset_id = ?
                  AND is_current = 1
                "#,
            )
            .bind(&input.id)
            .execute(&mut *transaction)
            .await?;

            let revision_id = Uuid::new_v4().to_string();

            sqlx::query(
                r#"
                INSERT INTO metadata_revisions (
                    id,
                    asset_id,
                    revision_number,
                    title,
                    description,
                    keyword_count,
                    generated_by,
                    status,
                    is_current,
                    created_at,
                    category
                )
                VALUES (?, ?, ?, ?, ?, ?, 'manual', 'review_required', 1,
                        datetime('now'), ?)
                "#,
            )
            .bind(&revision_id)
            .bind(&input.id)
            .bind(revision_number)
            .bind(title)
            .bind(description)
            .bind(keywords.len() as i64)
            .bind(category)
            .execute(&mut *transaction)
            .await?;

            for (position, keyword) in keywords.iter().enumerate() {
                sqlx::query(
                    r#"
                    INSERT INTO metadata_keywords (
                        id,
                        metadata_revision_id,
                        keyword,
                        position,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, datetime('now'))
                    "#,
                )
                .bind(Uuid::new_v4().to_string())
                .bind(&revision_id)
                .bind(keyword)
                .bind(position as i64)
                .execute(&mut *transaction)
                .await?;
            }
        }

        _ => {
            return Err(AppError::InvalidInput(
                "Invalid Metadata Studio item source.".into(),
            ));
        }
    }

    transaction.commit().await?;

    Ok(())
}
