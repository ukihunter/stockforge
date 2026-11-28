BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "activity_events" (
	"id"	TEXT,
	"event_type"	TEXT NOT NULL,
	"severity"	TEXT NOT NULL DEFAULT 'info' CHECK("severity" IN ('debug', 'info', 'warning', 'error')),
	"entity_type"	TEXT,
	"entity_id"	TEXT,
	"message"	TEXT NOT NULL,
	"details_json"	TEXT,
	"created_at"	TEXT NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "ai_models" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"provider_id"	TEXT NOT NULL,
	"model_name"	TEXT NOT NULL,
	"capabilities_json"	TEXT,
	"is_enabled"	INTEGER NOT NULL DEFAULT 1 CHECK("is_enabled" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	UNIQUE("provider_id","model_name"),
	FOREIGN KEY("provider_id") REFERENCES "ai_providers"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "ai_providers" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"name"	TEXT NOT NULL,
	"provider_type"	TEXT NOT NULL,
	"base_url"	TEXT,
	"is_enabled"	INTEGER NOT NULL DEFAULT 0 CHECK("is_enabled" IN (0, 1)),
	"is_default"	INTEGER NOT NULL DEFAULT 0 CHECK("is_default" IN (0, 1)),
	"config_json"	TEXT,
	"secret_ref"	TEXT,
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "ai_requests" (
	"id"	TEXT,
	"job_id"	TEXT,
	"provider_id"	TEXT,
	"model_id"	TEXT,
	"request_type"	TEXT NOT NULL,
	"status"	TEXT NOT NULL CHECK("status" IN ('pending', 'running', 'completed', 'failed')),
	"prompt_hash"	TEXT,
	"input_tokens"	INTEGER,
	"output_tokens"	INTEGER,
	"duration_ms"	INTEGER,
	"error_message"	TEXT,
	"created_at"	TEXT NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL,
	FOREIGN KEY("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL,
	FOREIGN KEY("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key"	TEXT,
	"value_json"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	PRIMARY KEY("key")
);
CREATE TABLE IF NOT EXISTS "asset_files" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"asset_id"	TEXT NOT NULL,
	"file_type"	TEXT NOT NULL CHECK("file_type" IN ('original', 'thumbnail', 'preview', 'processed', 'export', 'other')),
	"storage_path"	TEXT NOT NULL,
	"filename"	TEXT NOT NULL,
	"mime_type"	TEXT NOT NULL,
	"file_size"	INTEGER NOT NULL CHECK("file_size" >= 0),
	"width"	INTEGER CHECK("width" IS NULL OR "width" > 0),
	"height"	INTEGER CHECK("height" IS NULL OR "height" > 0),
	"checksum"	TEXT,
	"created_at"	TEXT NOT NULL,
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "asset_tags" (
	"asset_id"	TEXT NOT NULL,
	"tag_id"	TEXT NOT NULL,
	PRIMARY KEY("asset_id","tag_id"),
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE,
	FOREIGN KEY("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "assets" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"batch_id"	TEXT,
	"production_task_id"	TEXT,
	"original_filename"	TEXT NOT NULL,
	"display_name"	TEXT,
	"content_hash"	TEXT,
	"status"	TEXT NOT NULL DEFAULT 'imported' CHECK("status" IN ('imported', 'processing', 'metadata_pending', 'metadata_review', 'ready_to_submit', 'queued', 'submitting', 'submitted', 'published', 'rejected', 'failed', 'archived')),
	"metadata_status"	TEXT NOT NULL DEFAULT 'missing' CHECK("metadata_status" IN ('missing', 'generating', 'generated', 'review_required', 'approved', 'rejected')),
	"submission_status"	TEXT NOT NULL DEFAULT 'not_submitted' CHECK("submission_status" IN ('not_submitted', 'queued', 'uploading', 'awaiting_confirmation', 'submitted', 'in_review', 'published', 'rejected', 'failed', 'cancelled')),
	"source_type"	TEXT NOT NULL DEFAULT 'manual' CHECK("source_type" IN ('manual', 'generated', 'imported', 'other')),
	"source_details"	TEXT,
	"is_archived"	INTEGER NOT NULL DEFAULT 0 CHECK("is_archived" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	"deleted_at"	TEXT,
	"stock_idea_id"	TEXT,
	"is_selected"	INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL,
	FOREIGN KEY("production_task_id") REFERENCES "production_tasks"("id") ON DELETE SET NULL,
	FOREIGN KEY("stock_idea_id") REFERENCES "stock_ideas"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "automation_runs" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"run_type"	TEXT NOT NULL CHECK("run_type" IN ('import', 'processing', 'metadata', 'submission', 'batch', 'other')),
	"name"	TEXT,
	"status"	TEXT NOT NULL DEFAULT 'idle' CHECK("status" IN ('idle', 'running', 'waiting', 'pausing', 'paused', 'stopping', 'completed', 'failed', 'cancelled')),
	"total_jobs"	INTEGER NOT NULL DEFAULT 0,
	"completed_jobs"	INTEGER NOT NULL DEFAULT 0,
	"failed_jobs"	INTEGER NOT NULL DEFAULT 0,
	"skipped_jobs"	INTEGER NOT NULL DEFAULT 0,
	"config_json"	TEXT,
	"started_at"	TEXT,
	"finished_at"	TEXT,
	"created_at"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "batches" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"category"	TEXT,
	"style"	TEXT,
	"target_count"	INTEGER NOT NULL DEFAULT 0 CHECK("target_count" >= 0),
	"status"	TEXT NOT NULL DEFAULT 'draft' CHECK("status" IN ('draft', 'active', 'paused', 'completed', 'archived')),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	"completed_at"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "browser_profiles" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"name"	TEXT NOT NULL,
	"browser_type"	TEXT NOT NULL DEFAULT 'chromium',
	"profile_path"	TEXT NOT NULL UNIQUE,
	"is_default"	INTEGER NOT NULL DEFAULT 0 CHECK("is_default" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "browser_sessions" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"profile_id"	TEXT NOT NULL,
	"run_id"	TEXT,
	"status"	TEXT NOT NULL CHECK("status" IN ('starting', 'running', 'waiting', 'paused', 'closed', 'failed')),
	"started_at"	TEXT NOT NULL,
	"finished_at"	TEXT,
	"last_url"	TEXT,
	"error_message"	TEXT,
	FOREIGN KEY("profile_id") REFERENCES "browser_profiles"("id") ON DELETE RESTRICT,
	FOREIGN KEY("run_id") REFERENCES "automation_runs"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "job_attempts" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"job_id"	TEXT NOT NULL,
	"attempt_number"	INTEGER NOT NULL CHECK("attempt_number" > 0),
	"status"	TEXT NOT NULL CHECK("status" IN ('running', 'completed', 'failed', 'cancelled')),
	"error_code"	TEXT,
	"error_message"	TEXT,
	"started_at"	TEXT NOT NULL,
	"finished_at"	TEXT,
	"duration_ms"	INTEGER CHECK("duration_ms" IS NULL OR "duration_ms" >= 0),
	UNIQUE("job_id","attempt_number"),
	FOREIGN KEY("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "jobs" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"run_id"	TEXT,
	"asset_id"	TEXT,
	"batch_id"	TEXT,
	"job_type"	TEXT NOT NULL CHECK("job_type" IN ('import_asset', 'generate_thumbnail', 'validate_asset', 'detect_duplicate', 'analyze_image', 'generate_metadata', 'submit_asset', 'sync_submission_status', 'other')),
	"status"	TEXT NOT NULL DEFAULT 'pending' CHECK("status" IN ('pending', 'queued', 'running', 'waiting', 'paused', 'completed', 'failed', 'cancelled', 'skipped')),
	"priority"	INTEGER NOT NULL DEFAULT 0,
	"payload_json"	TEXT,
	"result_json"	TEXT,
	"error_code"	TEXT,
	"error_message"	TEXT,
	"max_attempts"	INTEGER NOT NULL DEFAULT 3 CHECK("max_attempts" > 0),
	"attempt_count"	INTEGER NOT NULL DEFAULT 0 CHECK("attempt_count" >= 0),
	"scheduled_at"	TEXT,
	"started_at"	TEXT,
	"finished_at"	TEXT,
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL,
	FOREIGN KEY("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL,
	FOREIGN KEY("run_id") REFERENCES "automation_runs"("id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "metadata_keywords" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"metadata_revision_id"	TEXT NOT NULL,
	"keyword"	TEXT NOT NULL,
	"position"	INTEGER NOT NULL CHECK("position" >= 0),
	"created_at"	TEXT NOT NULL,
	UNIQUE("metadata_revision_id","position"),
	FOREIGN KEY("metadata_revision_id") REFERENCES "metadata_revisions"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "metadata_revisions" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"asset_id"	TEXT NOT NULL,
	"revision_number"	INTEGER NOT NULL CHECK("revision_number" > 0),
	"title"	TEXT NOT NULL,
	"description"	TEXT,
	"keyword_count"	INTEGER NOT NULL DEFAULT 0 CHECK("keyword_count" >= 0),
	"generated_by"	TEXT NOT NULL DEFAULT 'manual',
	"model_name"	TEXT,
	"prompt_template_id"	TEXT,
	"generation_job_id"	TEXT,
	"status"	TEXT NOT NULL DEFAULT 'draft' CHECK("status" IN ('draft', 'review_required', 'approved', 'rejected')),
	"is_current"	INTEGER NOT NULL DEFAULT 1 CHECK("is_current" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	"approved_at"	TEXT,
	"category"	TEXT,
	UNIQUE("asset_id","revision_number"),
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "production_tasks" (
	"id"	TEXT,
	"batch_id"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"prompt"	TEXT,
	"notes"	TEXT,
	"target_count"	INTEGER NOT NULL DEFAULT 1 CHECK("target_count" > 0),
	"completed_count"	INTEGER NOT NULL DEFAULT 0 CHECK("completed_count" >= 0),
	"status"	TEXT NOT NULL DEFAULT 'pending' CHECK("status" IN ('pending', 'active', 'completed', 'failed', 'cancelled')),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "prompt_templates" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"template_type"	TEXT NOT NULL CHECK("template_type" IN ('image_analysis', 'title', 'description', 'keywords', 'metadata', 'other')),
	"template_text"	TEXT NOT NULL,
	"version"	INTEGER NOT NULL DEFAULT 1 CHECK("version" > 0),
	"is_active"	INTEGER NOT NULL DEFAULT 1 CHECK("is_active" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL,
	PRIMARY KEY("id"),
	UNIQUE("name","version")
);
CREATE TABLE IF NOT EXISTS "quality_checks" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"asset_id"	TEXT NOT NULL,
	"job_id"	TEXT,
	"check_type"	TEXT NOT NULL,
	"check_name"	TEXT NOT NULL,
	"status"	TEXT NOT NULL CHECK("status" IN ('passed', 'failed', 'warning', 'skipped')),
	"message"	TEXT,
	"details_json"	TEXT,
	"created_at"	TEXT NOT NULL,
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "queue_items" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"queue_id"	TEXT NOT NULL,
	"asset_id"	TEXT NOT NULL,
	"position"	INTEGER NOT NULL CHECK("position" >= 0),
	"status"	TEXT NOT NULL DEFAULT 'queued' CHECK("status" IN ('queued', 'processing', 'waiting', 'awaiting_confirmation', 'submitted', 'failed', 'skipped', 'cancelled')),
	"scheduled_at"	TEXT,
	"last_error"	TEXT,
	"added_at"	TEXT NOT NULL,
	"finished_at"	TEXT,
	UNIQUE("queue_id","asset_id"),
	UNIQUE("queue_id","position"),
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT,
	FOREIGN KEY("queue_id") REFERENCES "submission_queues"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "stock_ideas" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"category"	TEXT NOT NULL,
	"trend_research_json"	TEXT,
	"image_prompt"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"description"	TEXT NOT NULL,
	"keywords_json"	TEXT NOT NULL,
	"full_json"	TEXT NOT NULL,
	"created_at"	TEXT NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "submission_events" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"submission_id"	TEXT NOT NULL,
	"event_type"	TEXT NOT NULL,
	"message"	TEXT,
	"details_json"	TEXT,
	"created_at"	TEXT NOT NULL,
	FOREIGN KEY("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "submission_queues" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"name"	TEXT NOT NULL,
	"status"	TEXT NOT NULL DEFAULT 'draft' CHECK("status" IN ('draft', 'active', 'paused', 'completed', 'archived')),
	"daily_limit"	INTEGER NOT NULL DEFAULT 10 CHECK("daily_limit" > 0),
	"interval_minutes"	INTEGER NOT NULL DEFAULT 15 CHECK("interval_minutes" >= 0),
	"auto_continue"	INTEGER NOT NULL DEFAULT 0 CHECK("auto_continue" IN (0, 1)),
	"created_at"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "submissions" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"queue_item_id"	TEXT NOT NULL,
	"asset_id"	TEXT NOT NULL,
	"metadata_revision_id"	TEXT,
	"submission_number"	INTEGER NOT NULL CHECK("submission_number" > 0),
	"status"	TEXT NOT NULL CHECK("status" IN ('started', 'uploading', 'awaiting_confirmation', 'submitted', 'in_review', 'published', 'rejected', 'failed', 'cancelled')),
	"external_reference"	TEXT,
	"started_at"	TEXT,
	"submitted_at"	TEXT,
	"reviewed_at"	TEXT,
	"published_at"	TEXT,
	"rejection_reason"	TEXT,
	"error_message"	TEXT,
	"created_at"	TEXT NOT NULL,
	UNIQUE("queue_item_id","submission_number"),
	FOREIGN KEY("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT,
	FOREIGN KEY("metadata_revision_id") REFERENCES "metadata_revisions"("id") ON DELETE SET NULL,
	FOREIGN KEY("queue_item_id") REFERENCES "queue_items"("id") ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "tags" (
	"id"	TEXT PRIMARYPRIMARY KEY,
	"name"	TEXT NOT NULL UNIQUE,
	"color"	TEXT,
	"created_at"	TEXT NOT NULL
);
INSERT INTO "app_settings" VALUES ('app.preferences','{"accentColor":"rose","aiProvider":"Gemini","completionAlerts":true,"defaultWorkspace":"Overview","errorAlerts":true,"imageGenerationDelay":30,"notifications":true,"publishingDelay":30,"retryLimit":"3","startup":true,"storagePath":"C:\\Users\\GIGABYTE\\Pictures\\StockForge Assets","theme":"Dark","workerLimit":"2"}','2026-11-26 15:35:49');
INSERT INTO "asset_files" VALUES ('4d1bb6ad-0dcc-4945-8bc4-de6e3d772ad3','a4b948f9-4baa-4abf-822d-b35621b213c2','original','E:\lol\originals\9d38d944-c05c-4e4f-924a-df327bbda9c0\a4b948f9-4baa-4abf-822d-b35621b213c2.jpg','batman-sign-black-background-dc-superheroes-amoled-5k-8k-10k-10000x6250-4409-2392529660.jpg','image/jpeg',1045688,NULL,NULL,NULL,'2026-11-26 07:29:58');
INSERT INTO "assets" VALUES ('a4b948f9-4baa-4abf-822d-b35621b213c2','9d38d944-c05c-4e4f-924a-df327bbda9c0',NULL,'batman-sign-black-background-dc-superheroes-amoled-5k-8k-10k-10000x6250-4409-2392529660.jpg','batman sign black background dc superheroes amoled 5k 8k 10k 10000x6250 4409 2392529660',NULL,'metadata_review','review_required','not_submitted','manual',NULL,0,'2026-11-26 07:29:58','2026-11-26 07:29:58',NULL,NULL,0);
INSERT INTO "batches" VALUES ('200c9597-374b-410d-bbe6-4eff7fdafa69','sdasdasd',NULL,NULL,NULL,1,'draft','2026-11-26 07:19:44','2026-11-26 07:19:44',NULL);
INSERT INTO "batches" VALUES ('9d38d944-c05c-4e4f-924a-df327bbda9c0','dfdsafdsf',NULL,NULL,NULL,1,'active','2026-11-26 07:29:58','2026-11-26 07:29:58',NULL);
INSERT INTO "metadata_keywords" VALUES ('99689625-e584-48b7-b69e-8f906041b1ce','403220e7-5ec9-4204-8357-7aa0f2337942','dadad
dasdad',0,'2026-11-26 07:29:58');
INSERT INTO "metadata_revisions" VALUES ('403220e7-5ec9-4204-8357-7aa0f2337942','a4b948f9-4baa-4abf-822d-b35621b213c2',1,'batman sign black background dc superheroes amoled 5k 8k 10k 10000x6250 4409 2392529660','dasda',1,'manual',NULL,NULL,NULL,'review_required',1,'2026-11-26 07:29:58',NULL,'Architecture');
INSERT INTO "stock_ideas" VALUES ('e4e34d34-3f5d-48a9-a434-3d2c9fbc390d','The Tech-Savvy Mentor','Lifestyle','{
  "selectedNiche": {
    "name": "Inclusive Aging and Active Seniors",
    "category": "Lifestyle",
    "description": "High-quality, non-stereotypical imagery of seniors engaged in technology, fitness, and modern career roles.",
    "trendReason": "Global demographic shifts are driving brands to represent the ''silver economy'' as active, tech-savvy participants rather than passive subjects.",
    "commercialPotential": "high",
    "targetBuyers": [
      "Healthcare providers",
      "Financial planning firms",
      "Pharmaceutical advertisers"
    ],
    "sources": [
      "https://www.gettyimages.com/editorial-images/creative-insights/trends"
    ]
  },
  "generatedResearch": {
    "summary": "The global demographic shift towards an aging population is redefining the ''silver economy,'' moving away from passive tropes toward active, professional, and technologically proficient representations of seniors.",
    "trends": [
      {
        "trend": "Silver Economy Professionalism",
        "reason": "Businesses are increasingly targeting seniors as active contributors to the workforce and modern economy rather than relying on historical tropes of frailty.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      },
      {
        "trend": "Tech-Fluent Aging",
        "reason": "There is a growing demand for imagery that validates the integration of seniors into the digital age and remote work environments.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      },
      {
        "trend": "Intergenerational Collaboration",
        "reason": "Modern advertising seeks to depict seniors as mentors and active participants in collaborative, technology-driven workspaces.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      }
    ]
  },
  "groundingMetadata": null
}','A high-resolution, photorealistic lifestyle shot of a stylish, confident 70-year-old woman with silver hair, wearing modern professional attire, sitting at a clean, minimalist glass desk in a sunlit co-working space. She is actively using a high-end ultra-slim laptop and a smartphone, demonstrating focus and expertise. Next to her, a slightly out-of-focus younger person is listening intently, representing a collaborative mentor-mentee dynamic. Bright, airy office environment with indoor plants and soft-focus architecture in the background. Natural morning sunlight with warm highlights and soft shadows. High-end editorial photography style, shallow depth of field, sharp focus on the senior woman''s face and hands, 85mm lens, neutral color palette with pops of professional teal and warm wood tones. Abundant negative space on the right side of the frame for advertising copy.','Senior Professional Working on Laptop in Modern Office','An active and professional senior woman using modern technology to collaborate in a bright, contemporary co-working office, representing the active silver economy and professional empowerment.','["senior","professional","technology","business","lifestyle","innovation","mentorship","collaboration","laptop","office","silver economy","active aging","corporate","entrepreneur","modern","diversity","inclusion","digital literacy","woman","career","remote work","expert","success","wisdom","productivity","workspace","contemporary","health","well-being","leadership","achievement","communications","adult","confidence","employment","skills"]','{
  "name": "The Tech-Savvy Mentor",
  "category": "Lifestyle",
  "imagePrompt": "A high-resolution, photorealistic lifestyle shot of a stylish, confident 70-year-old woman with silver hair, wearing modern professional attire, sitting at a clean, minimalist glass desk in a sunlit co-working space. She is actively using a high-end ultra-slim laptop and a smartphone, demonstrating focus and expertise. Next to her, a slightly out-of-focus younger person is listening intently, representing a collaborative mentor-mentee dynamic. Bright, airy office environment with indoor plants and soft-focus architecture in the background. Natural morning sunlight with warm highlights and soft shadows. High-end editorial photography style, shallow depth of field, sharp focus on the senior woman''s face and hands, 85mm lens, neutral color palette with pops of professional teal and warm wood tones. Abundant negative space on the right side of the frame for advertising copy.",
  "trendResearch": {
    "summary": "The global demographic shift towards an aging population is redefining the ''silver economy,'' moving away from passive tropes toward active, professional, and technologically proficient representations of seniors.",
    "trends": [
      {
        "trend": "Silver Economy Professionalism",
        "reason": "Businesses are increasingly targeting seniors as active contributors to the workforce and modern economy rather than relying on historical tropes of frailty.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      },
      {
        "trend": "Tech-Fluent Aging",
        "reason": "There is a growing demand for imagery that validates the integration of seniors into the digital age and remote work environments.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      },
      {
        "trend": "Intergenerational Collaboration",
        "reason": "Modern advertising seeks to depict seniors as mentors and active participants in collaborative, technology-driven workspaces.",
        "sources": [
          "https://www.gettyimages.com/editorial-images/creative-insights/trends"
        ]
      }
    ]
  },
  "metadata": {
    "title": "Senior Professional Working on Laptop in Modern Office",
    "description": "An active and professional senior woman using modern technology to collaborate in a bright, contemporary co-working office, representing the active silver economy and professional empowerment.",
    "keywords": [
      "senior",
      "professional",
      "technology",
      "business",
      "lifestyle",
      "innovation",
      "mentorship",
      "collaboration",
      "laptop",
      "office",
      "silver economy",
      "active aging",
      "corporate",
      "entrepreneur",
      "modern",
      "diversity",
      "inclusion",
      "digital literacy",
      "woman",
      "career",
      "remote work",
      "expert",
      "success",
      "wisdom",
      "productivity",
      "workspace",
      "contemporary",
      "health",
      "well-being",
      "leadership",
      "achievement",
      "communications",
      "adult",
      "confidence",
      "employment",
      "skills"
    ]
  },
  "groundingMetadata": null
}','2026-11-25T10:43:02.640Z');
INSERT INTO "stock_ideas" VALUES ('f99574d8-627d-4145-b9d7-b703099ea08d','Urban Micro-Farm Soil Health','Environment','{
  "selectedNiche": {
    "name": "Regenerative Agriculture and Urban Farming",
    "category": "Environment",
    "description": "Visuals focused on small-scale urban gardening, soil health, and sustainable farming practices.",
    "trendReason": "Climate consciousness is driving advertising towards proof of sustainable practices rather than just ''green'' aesthetic overlays.",
    "commercialPotential": "high",
    "targetBuyers": [
      "Food and beverage brands",
      "Environmental NGOs",
      "Corporate sustainability reports"
    ],
    "sources": [
      "https://business.adobe.com/blog/basics/stock-photography-trends"
    ]
  },
  "generatedResearch": {
    "summary": "The shift in environmental visual communication is moving from abstract green imagery to tangible proof of regenerative practices, specifically highlighting soil health and small-scale urban agricultural resilience.",
    "trends": [
      {
        "trend": "Proof of Practice",
        "reason": "Brands are increasingly required to provide visual evidence of sustainable methods rather than relying on generic eco-friendly marketing tropes.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      },
      {
        "trend": "Hyper-local Sustainability",
        "reason": "Urban gardening is a visual shorthand for community-driven climate action and resource self-sufficiency.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      },
      {
        "trend": "Authentic Soil Narrative",
        "reason": "Focusing on earth, mycelium, and nutrient-dense soil quality communicates long-term regenerative health to corporate stakeholders.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      }
    ]
  },
  "groundingMetadata": null
}','A close-up, high-detail photograph of a pair of hands gently crumbling dark, nutrient-rich, dark loamy soil over a small, vibrant green seedling planted in a raised wooden garden bed. In the background, a soft-focus urban rooftop garden with terracotta pots and vertical climbing plants creates a bokeh effect. The lighting is bright, natural morning sunlight that highlights the texture of the soil and the organic moisture on the leaves. Medium-tight shot, shallow depth of field, macro focus on the soil particles. Earthy tones: deep browns, rich greens, and warm sunlight hues. Professional, clean composition with generous negative space on the left for copy placement. Photorealistic, 8k resolution, documentary style.','Close-up of hands crumbling nutrient-rich soil in an urban garden','A detailed close-up of a person''s hands tending to a seedling in an urban rooftop garden, showcasing rich, healthy soil and regenerative agriculture practices for sustainability concepts.','["regenerative agriculture","urban farming","soil health","sustainability","organic gardening","climate action","rooftop garden","seedling","gardening","environment","nature","agriculture","ecology","permaculture","green living","hands","growth","biodiversity","compost","fertile","sustainable farming","local food","conservation","earth","planting","nurturing","farming","environmental awareness","urban lifestyle","healthy soil","agronomy","plant life"]','{
  "name": "Urban Micro-Farm Soil Health",
  "category": "Environment",
  "imagePrompt": "A close-up, high-detail photograph of a pair of hands gently crumbling dark, nutrient-rich, dark loamy soil over a small, vibrant green seedling planted in a raised wooden garden bed. In the background, a soft-focus urban rooftop garden with terracotta pots and vertical climbing plants creates a bokeh effect. The lighting is bright, natural morning sunlight that highlights the texture of the soil and the organic moisture on the leaves. Medium-tight shot, shallow depth of field, macro focus on the soil particles. Earthy tones: deep browns, rich greens, and warm sunlight hues. Professional, clean composition with generous negative space on the left for copy placement. Photorealistic, 8k resolution, documentary style.",
  "trendResearch": {
    "summary": "The shift in environmental visual communication is moving from abstract green imagery to tangible proof of regenerative practices, specifically highlighting soil health and small-scale urban agricultural resilience.",
    "trends": [
      {
        "trend": "Proof of Practice",
        "reason": "Brands are increasingly required to provide visual evidence of sustainable methods rather than relying on generic eco-friendly marketing tropes.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      },
      {
        "trend": "Hyper-local Sustainability",
        "reason": "Urban gardening is a visual shorthand for community-driven climate action and resource self-sufficiency.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      },
      {
        "trend": "Authentic Soil Narrative",
        "reason": "Focusing on earth, mycelium, and nutrient-dense soil quality communicates long-term regenerative health to corporate stakeholders.",
        "sources": [
          "https://business.adobe.com/blog/basics/stock-photography-trends"
        ]
      }
    ]
  },
  "metadata": {
    "title": "Close-up of hands crumbling nutrient-rich soil in an urban garden",
    "description": "A detailed close-up of a person''s hands tending to a seedling in an urban rooftop garden, showcasing rich, healthy soil and regenerative agriculture practices for sustainability concepts.",
    "keywords": [
      "regenerative agriculture",
      "urban farming",
      "soil health",
      "sustainability",
      "organic gardening",
      "climate action",
      "rooftop garden",
      "seedling",
      "gardening",
      "environment",
      "nature",
      "agriculture",
      "ecology",
      "permaculture",
      "green living",
      "hands",
      "growth",
      "biodiversity",
      "compost",
      "fertile",
      "sustainable farming",
      "local food",
      "conservation",
      "earth",
      "planting",
      "nurturing",
      "farming",
      "environmental awareness",
      "urban lifestyle",
      "healthy soil",
      "agronomy",
      "plant life"
    ]
  },
  "groundingMetadata": null
}','2026-11-26T05:35:53.685Z');
CREATE INDEX IF NOT EXISTS "idx_activity_created" ON "activity_events" (
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_activity_entity" ON "activity_events" (
	"entity_type",
	"entity_id"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ai_default_provider" ON "ai_providers" (
	"is_default"
) WHERE "is_default" = 1;
CREATE INDEX IF NOT EXISTS "idx_ai_requests_created" ON "ai_requests" (
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_asset_files_asset" ON "asset_files" (
	"asset_id"
);
CREATE INDEX IF NOT EXISTS "idx_asset_files_type" ON "asset_files" (
	"asset_id",
	"file_type"
);
CREATE INDEX IF NOT EXISTS "idx_assets_batch" ON "assets" (
	"batch_id"
);
CREATE INDEX IF NOT EXISTS "idx_assets_created" ON "assets" (
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_assets_hash" ON "assets" (
	"content_hash"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_assets_id_unique_repair" ON "assets" (
	"id"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_assets_one_selected_per_idea" ON "assets" (
	"stock_idea_id"
) WHERE "is_selected" = 1 AND "stock_idea_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets" (
	"status"
);
CREATE INDEX IF NOT EXISTS "idx_assets_stock_idea" ON "assets" (
	"stock_idea_id"
);
CREATE INDEX IF NOT EXISTS "idx_assets_task" ON "assets" (
	"production_task_id"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_browser_default" ON "browser_profiles" (
	"is_default"
) WHERE "is_default" = 1;
CREATE INDEX IF NOT EXISTS "idx_browser_sessions_status" ON "browser_sessions" (
	"status"
);
CREATE INDEX IF NOT EXISTS "idx_jobs_asset" ON "jobs" (
	"asset_id"
);
CREATE INDEX IF NOT EXISTS "idx_jobs_run" ON "jobs" (
	"run_id"
);
CREATE INDEX IF NOT EXISTS "idx_jobs_scheduled" ON "jobs" (
	"status",
	"scheduled_at"
);
CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" (
	"status",
	"priority"	DESC,
	"created_at"
);
CREATE INDEX IF NOT EXISTS "idx_metadata_asset" ON "metadata_revisions" (
	"asset_id",
	"revision_number"	DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_metadata_current" ON "metadata_revisions" (
	"asset_id"
) WHERE "is_current" = 1;
CREATE INDEX IF NOT EXISTS "idx_metadata_keywords_revision" ON "metadata_keywords" (
	"metadata_revision_id"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_metadata_revisions_id_unique_repair" ON "metadata_revisions" (
	"id"
);
CREATE INDEX IF NOT EXISTS "idx_production_tasks_batch" ON "production_tasks" (
	"batch_id",
	"status"
);
CREATE INDEX IF NOT EXISTS "idx_quality_asset" ON "quality_checks" (
	"asset_id",
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_queue_items_processing" ON "queue_items" (
	"queue_id",
	"status",
	"position"
);
CREATE INDEX IF NOT EXISTS "idx_runs_created" ON "automation_runs" (
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_runs_status" ON "automation_runs" (
	"status"
);
CREATE INDEX IF NOT EXISTS "idx_submission_events" ON "submission_events" (
	"submission_id",
	"created_at"
);
CREATE INDEX IF NOT EXISTS "idx_submissions_asset" ON "submissions" (
	"asset_id",
	"created_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_submissions_status" ON "submissions" (
	"status"
);
COMMIT;
