# OneMerge Deployment Guide for Render

This guide will help you deploy the OneMerge application to Render.com.

## 🚀 Quick Deployment Commands

### Option 1: Using Render.yaml (Recommended)

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: Add deployment configuration"
git push origin main
```

2. **Deploy on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository: `https://github.com/RachitPatel-RAM/onemerge`
   - Render will automatically detect the `render.yaml` file and deploy both services

### Option 2: Manual Deployment

#### Frontend Deployment:
```bash
# Build the frontend
npm install
npm run build:prod

# Deploy to Render as Static Site
# Build Command: npm install && npm run build
# Publish Directory: dist
```

#### Backend Deployment:
```bash
# Build the backend
cd server
npm install
npm run build

# Deploy to Render as Web Service
# Build Command: cd server && npm install && npm run build
# Start Command: cd server && npm start
```

## 🔧 Environment Variables

### Frontend Environment Variables:
- `VITE_API_URL`: Set to your backend URL (e.g., `https://onemerge-api.onrender.com/api`)

### Backend Environment Variables:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render default)
- `CORS_ORIGIN`: Your frontend URL (e.g., `https://onemerge-frontend.onrender.com`)
- `MAX_FILE_SIZE`: `50MB`

## 📁 Project Structure for Deployment

```
onemerge/
├── render.yaml          # Render deployment configuration
├── Dockerfile          # Docker configuration (alternative)
├── deploy.sh           # Deployment script
├── DEPLOYMENT.md       # This guide
├── dist/              # Frontend build output
├── server/
│   ├── dist/          # Backend build output
│   ├── .env.production # Production environment
│   └── package.json   # Backend dependencies
└── package.json       # Frontend dependencies
```

## 🛠️ Build Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build:prod` | Build frontend for production |
| `npm run deploy:build` | Build both frontend and backend |
| `npm run deploy:render` | Run deployment script |

## 🔍 Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Ensure all dependencies are in package.json
   - Check Node.js version compatibility (use Node 18+)

2. **CORS Errors:**
   - Update `CORS_ORIGIN` environment variable
   - Ensure frontend URL matches exactly

3. **File Upload Issues:**
   - Render has ephemeral storage
   - Files are temporary and will be cleaned up

### Health Check:
Your backend will be available at: `https://your-backend-url.onrender.com/api/health`

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] Frontend service created on Render
- [ ] Backend service created on Render
- [ ] CORS settings updated
- [ ] Health check endpoint working
- [ ] File upload/merge functionality tested

## 🌐 Live URLs

After deployment, your application will be available at:
- **Frontend**: `https://onemerge-frontend.onrender.com`
- **Backend API**: `https://onemerge-api.onrender.com`

## 📞 Support

If you encounter issues during deployment, check:
1. Render service logs
2. GitHub repository settings
3. Environment variable configuration
4. Build command syntax