# OpenDots Blog

A Hugo-based blog for OpenDots, deployed on Cloudflare Pages.

## Local Development

### Prerequisites

Install Hugo: https://gohugo.io/installation/

**Windows (Chocolatey):**
```bash
choco install hugo-extended
```

**macOS (Homebrew):**
```bash
brew install hugo
```

### Run Locally

```bash
cd blogs
hugo server -D
```

Visit `http://localhost:1313`

### Create New Post

```bash
hugo new posts/my-new-post.md
```

Edit the file in `content/posts/my-new-post.md`, set `draft: false` when ready to publish.

## Deployment

This blog is deployed on Cloudflare Pages (NOT Workers).

### Cloudflare Pages Setup

1. Go to Cloudflare Dashboard → **Pages** (not Workers & Pages → Workers)
2. Click "Create a project" → "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Framework preset:** Hugo
   - **Build command:** `hugo`
   - **Build output directory:** `public`
   - **Root directory (path):** `blogs`
5. Add Environment Variable:
   - **Variable name:** `HUGO_VERSION`
   - **Value:** `0.140.0`
6. Click "Save and Deploy"

> ⚠️ **Important:** Do NOT use `wrangler deploy` - that's for Workers. Pages deploys automatically from Git.

### Custom Domain

1. In Cloudflare Pages project settings → Custom domains
2. Add `blogs.opendots.in`
3. Configure DNS in Cloudflare:
   - Type: CNAME
   - Name: blogs
   - Target: `<your-pages-project>.pages.dev`

## URL Structure

Posts are accessible at: `https://blogs.opendots.in/{slug}/`

Example: `https://blogs.opendots.in/welcome-to-opendots/`

## Content Structure

```
content/
├── _index.md          # Homepage content
├── about.md           # About page
└── posts/
    ├── _index.md      # Posts listing page
    └── *.md           # Individual posts
```

## Post Front Matter

```yaml
---
title: "Post Title"
date: 2024-12-18
draft: false
slug: "url-slug"
description: "SEO description"
tags: ["tag1", "tag2"]
author: "Author Name"
cover:
  image: "/images/cover.jpg"
  alt: "Cover image description"
---
```

## Theme Customization

Theme files are in `themes/opendots-theme/`:
- `layouts/` - HTML templates
- `static/css/style.css` - Styles
