# Document Comparison Tool

A web application that allows users to compare documents side-by-side, highlighting the differences between them. This tool supports PDF files and Markdown documents with client-side processing for enhanced privacy.

![Document Comparison Tool Screenshot](./public/screenshot.png)

## Features

- File upload for two documents (PDF or Markdown)
- Side-by-side comparison view
- Highlighted differences (additions in green, deletions in red)
- Markdown-specific features:
  - Toggle between raw markdown and rendered views
- Client-side processing (no server storage of files)
- Responsive design
- Dark and light theme support

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/compare-docs.git
cd compare-docs
```

2. Install dependencies
```bash
npm install
# or
pnpm install
```

3. Start the development server
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload two documents (PDF or Markdown) using the file upload interface
2. Click "Compare Documents" to process and compare the files
3. View the differences highlighted in the side-by-side comparison view
4. For Markdown files, toggle between raw and rendered views

## Project Structure

```
compare-docs/
├── app/                  # Next.js app directory
│   ├── compare/          # Comparison page
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── atoms/            # Basic UI components
│   ├── molecules/        # Composed components
│   ├── organisms/        # Complex components
│   ├── templates/        # Page templates
│   └── ui/               # Shadcn UI components
├── lib/                  # Utility functions and context
│   ├── document-context.tsx  # Document state management
│   ├── file-utils.ts     # File handling utilities
│   └── utils.ts          # General utilities
└── public/               # Static assets
```

## Future Enhancements

- Support for additional document formats (DOCX, TXT)
- Annotation capabilities
- Share comparison results via unique URL
- Offline functionality with Progressive Web App features
- More sophisticated diff algorithm for better comparison results

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by GitHub's diff functionality
- Built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
