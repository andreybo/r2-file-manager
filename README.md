# Cloudflare R2 Image Manager

A simple and efficient image management application for Cloudflare R2 storage. Upload, organize, and manage images with ease.

## Features

- Upload JPG and PNG images to Cloudflare R2
- Create folder structure to organize images
- View images in grid or list layout
- Copy image URLs for sharing
- Delete images when no longer needed
- Fast and responsive UI

## Setup

1. Clone this repository
2. Install dependencies with `yarn install`
3. Create a `.env.local` file with your Cloudflare R2 credentials:
   ```
   NEXT_PUBLIC_R2_ENDPOINT=https://[accountid].r2.cloudflarestorage.com
   NEXT_PUBLIC_R2_ACCESS_KEY_ID=your_access_key_id
   NEXT_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_access_key
   NEXT_PUBLIC_R2_BUCKET_NAME=your_bucket_name
   ```
4. Run the development server with `yarn dev`
5. Access the application at http://localhost:9002

## Development

- `yarn dev` - Start development server (port 9002)
- `yarn build` - Build production version
- `yarn start` - Start production server
- `yarn lint` - Run linting checks
- `yarn typecheck` - Run type checking

## Technologies

- Next.js 15
- React 18
- AWS SDK for JavaScript (S3 client for R2)
- TypeScript
- Tailwind CSS
- React Dropzone for file uploads