use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataStudioImage {
    pub asset_id: String,
    pub image_path: Option<String>,
    pub image_generation_status: String,
    pub is_selected: bool,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataStudioItem {
    pub id: String,
    pub source: String,
    pub name: String,
    pub category: String,
    pub title: String,
    pub description: String,
    pub keywords: Vec<String>,
    pub image_prompt: String,
    pub images: Vec<MetadataStudioImage>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataStudioData {
    pub items: Vec<MetadataStudioItem>,
    pub total: i64,
    pub missing_images: i64,
    pub images_ready: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataStudioUpdate {
    pub id: String,
    pub source: String,
    pub name: String,
    pub category: String,
    pub title: String,
    pub description: String,
    pub keywords: Vec<String>,
    pub image_prompt: String,
}
