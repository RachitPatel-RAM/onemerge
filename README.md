# OneMerge - Universal File Merger

A powerful web application that allows you to merge multiple file formats (DOCX, PDF, TXT, PPTX, Images, and more) into a single universal file. Fast, secure, and professional file merging solution.

## Features

- **Multi-format Support**: Merge DOCX, PDF, TXT, PPTX, PNG, JPG, and other file formats
- **Secure Processing**: Files are processed locally with no data retention
- **Professional Output**: High-quality PDF generation with proper formatting
- **Modern UI**: Clean, intuitive interface built with React and Tailwind CSS
- **Fast Processing**: Efficient file handling and conversion

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/RachitPatel-RAM/onemerge.git
cd onemerge
```

2. Install dependencies for the frontend:
```bash
npm install
```

3. Install dependencies for the backend:
```bash
cd server
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the frontend:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:8080`

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Node.js, Express, TypeScript
- **File Processing**: pdf-lib, mammoth, adm-zip, sharp
- **Development**: nodemon, ts-node

## Project Structure

```
onemerge/
├── src/                 # Frontend source code
├── server/             # Backend source code
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── services/   # File processing services
│   │   └── utils/      # Utility functions
│   ├── uploads/        # Temporary file uploads
│   └── output/         # Generated output files
└── public/             # Static assets
```

## API Endpoints

- `POST /api/merge` - Merge multiple files into a single PDF
- `GET /api/health` - Health check endpoint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
