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

This blog is deployed on Cloudflare Pages.

### Cloudflare Pages Setup

1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `hugo --minify`
   - **Build output directory:** `public`
   - **Root directory:** `blogs`
   - **Environment variable:** `HUGO_VERSION` = `0.140.0`

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
