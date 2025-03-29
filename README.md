# WhatsApp Presentation Bot

This application is a WhatsApp bot that helps users create presentations through a conversational interface. It supports both Google Slides and PDF-based presentations.

## Features

- Create presentations by chatting with a WhatsApp bot
- Support for both Google Slides and local PDF presentations
- Simple conversation flow for creating presentations
- Automatic storage of presentation data in Supabase

## Presentation Modes

### PDF Presentation Mode

When using PDF presentation mode (`PRESENTATION_MODE=pdf` in `.env`):

- Presentations are generated as PDF files in the `presentations` directory
- No Google authentication is required
- PDF files include a title slide and content slides for each topic
- The bot will provide a local file URL to access the presentation

### Google Slides Mode

When using Google Slides mode (`PRESENTATION_MODE=google` in `.env`):

- You'll need to authenticate with Google
- Presentations are created in your Google Drive
- The bot will provide a web link to access the presentation

## Supabase Setup

This application uses Supabase as its database. Before running the application, you need to set up the required database tables in your Supabase project.

### Setting up the Database

1. Log in to your Supabase dashboard at https://app.supabase.io
2. Select your project
3. Go to the SQL Editor
4. Open the `supabase_setup.sql` file from this project
5. Copy and paste the SQL code into the SQL Editor
6. Run the SQL script to create the necessary tables

### Required Tables

The application requires two tables:

1. **users** - Stores user state and conversation data

   - `id`: Serial primary key
   - `whatsapp_id`: Unique identifier for the WhatsApp user
   - `data`: JSON data containing user state
   - `created_at`: Timestamp when the record was created
   - `updated_at`: Timestamp when the record was last updated

2. **presentations** - Stores information about created presentations
   - `id`: Serial primary key
   - `whatsapp_id`: Foreign key referencing users.whatsapp_id
   - `title`: Title of the presentation
   - `topics`: Array of topics for the presentation
   - `presentation_url`: URL to the created Google Slides presentation
   - `created_at`: Timestamp when the presentation was created

### Environment Variables

Make sure your `.env` file contains the correct Supabase credentials:

```
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Running the Application

1. Install dependencies: `npm install`
2. Start the application: `node bot.js`

## Troubleshooting

If you encounter database-related errors, make sure:

1. The Supabase tables are created correctly
2. Your environment variables are set correctly
3. Your Supabase project has the correct permissions for the anonymous key
