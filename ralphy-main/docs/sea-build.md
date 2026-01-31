# Building LPL IDE as a Single Executable

This guide explains how to package the LPL IDE as a single executable application using Node.js SEA (Single Executable Applications).

## Prerequisites

- Node.js v20 or higher (SEA support)
- npm for installing dependencies
- Platform-specific tools:
  - macOS: Xcode Command Line Tools (for codesign)
  - Windows: Visual Studio Build Tools (optional, for signing)
  - Linux: Standard build essentials

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the single executable:
   ```bash
   npm run build
   ```

3. Find the executable in the `dist/` directory:
   - macOS: `dist/lpl-ide-macos`
   - Linux: `dist/lpl-ide-linux`
   - Windows: `dist/lpl-ide.exe`

## Build Process

The build process uses Node.js's experimental SEA (Single Executable Applications) feature to bundle the entire IDE into a single executable file. Here's what happens:

1. **SEA Configuration** (`sea-config.json`):
   - Specifies the main entry point (`src/server/index.js`)
   - Enables code caching for faster startup
   - Disables experimental warnings

2. **Build Script** (`scripts/build-sea.js`):
   - Generates a SEA blob containing the application code
   - Copies the Node.js executable
   - Injects the blob into the executable
   - Handles platform-specific signing requirements
   - Creates wrapper scripts for easier launching

## Platform-Specific Notes

### macOS
- The executable is automatically signed with an ad-hoc signature
- The build process removes existing signatures before injection
- Output: `lpl-ide-macos`

### Linux
- Direct blob injection without signing requirements
- Output: `lpl-ide-linux`
- Make sure the executable has proper permissions

### Windows
- Creates a `.exe` file with optional signing support
- Includes a `.bat` wrapper for convenience
- Output: `lpl-ide.exe`

## Running the Executable

After building, you can run the IDE directly:

```bash
# macOS/Linux
./dist/lpl-ide-macos   # or lpl-ide-linux
./dist/lpl-ide         # wrapper script

# Windows
dist\lpl-ide.exe
dist\lpl-ide.bat       # wrapper script
```

Command-line arguments work the same as the regular version:

```bash
./dist/lpl-ide --port 8080 --root /path/to/project --no-open
```

## File Size

The single executable includes the entire Node.js runtime and all application code. Typical sizes:
- macOS: ~90-100 MB
- Linux: ~85-95 MB
- Windows: ~80-90 MB

## Distribution

The executable is completely self-contained and can be distributed without any dependencies:

1. Copy the executable to any location
2. No Node.js installation required
3. No npm packages to install
4. Just run and go!

## Troubleshooting

### "Code signature invalid" on macOS
The build script automatically handles signing, but if you encounter issues:
```bash
codesign --sign - dist/lpl-ide-macos
```

### Permission denied on Linux
Make the file executable:
```bash
chmod +x dist/lpl-ide-linux
```

### Build fails with "postject not found"
Install development dependencies:
```bash
npm install --save-dev postject
```

## Technical Details

- Uses Node.js v20+ experimental SEA feature
- Bundles all JavaScript code into a binary blob
- Injects blob into Node.js executable using postject
- Maintains full functionality of the regular version
- Zero runtime dependencies

## Limitations

- Cannot dynamically load external modules at runtime
- All code must be bundled at build time
- File watching for auto-reload works normally
- Static assets are served from the filesystem as usual

## Development

To test the build process without creating an executable:

```bash
node test-sea-build.js
```

This runs verification tests to ensure SEA support is properly configured.