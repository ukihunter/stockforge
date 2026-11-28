use tauri::State;

use crate::{
    db::DbState,
    models::metadata_studio::{MetadataStudioData, MetadataStudioUpdate},
    services::metadata_studio,
};

#[tauri::command]
pub async fn get_metadata_studio_data(
    state: State<'_, DbState>,
) -> Result<MetadataStudioData, String> {
    metadata_studio::get_metadata_studio_data(&state.pool)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn import_manual_image(
    state: State<'_, DbState>,
    stock_idea_id: String,
    source_path: String,
) -> Result<String, String> {
    metadata_studio::import_manual_image(&state.pool, &stock_idea_id, &source_path)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_metadata_studio_item(
    state: State<'_, DbState>,
    input: MetadataStudioUpdate,
) -> Result<(), String> {
    metadata_studio::save_metadata_studio_item(&state.pool, input)
        .await
        .map_err(|error| error.to_string())
}
