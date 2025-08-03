# LightIPTV Player - Desktop Application

A modern, feature-rich IPTV player built with Electron for Windows desktop.

## Features

- **Modern Interface**: Clean, responsive design with dark/light mode support
- **IPTV Support**: Full Xtream Codes API compatibility
- **Live TV**: Browse and watch live television channels
- **Movies & Series**: Access your IPTV provider's movie and series catalog
- **Favorites**: Save your favorite channels and categories
- **Theatre Mode**: Distraction-free viewing experience
- **Subtitle Support**: Import and sync subtitle files
- **Multiple View Modes**: Grid and list views for channel browsing
- **Search Functionality**: Quick search across channels and categories
- **Resizable Player**: Customizable video player with multiple aspect ratios

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm start
   ```

3. **Build for Windows**
   ```bash
   npm run build-win
   ```

   This will create a Windows installer in the `dist` folder.

## Building the Application

### Development

To run the application in development mode:

```bash
npm start
```

### Production Build

To create a Windows executable:

```bash
# Build Windows installer
npm run build-win

# Or build all platforms
npm run build

# Create unpacked directory (for testing)
npm run pack
```

The built application will be available in the `dist` folder.

## Building for Windows

### Portable Application
```bash
# Build the portable executable
npm run build-win

# The executable will be created in:
# dist/lightiptv-player-win32-x64/lightiptv-player.exe
```

### Windows Installer
```bash
# First build the portable app
npm run build-win

# Then create the installer package
.\create-installer.bat

# The installer will be created in the 'installer' folder:
# - Install-LightIPTV-Player.bat (Run as Administrator to install)
# - LightIPTV-Player\ (Application files)
# - README.txt (Installation instructions)
```

## Usage

1. **Launch the Application**
   - Run the executable or use `npm start` for development

2. **Login**
   - Enter your IPTV provider's Xtream Codes credentials:
     - Server URL (e.g., `http://example.com:8080`)
     - Username
     - Password

3. **Browse Content**
   - Use the sidebar to browse categories
   - Switch between Live TV, Movies, and Series
   - Use the search function to find specific content

4. **Watch Content**
   - Click on any channel or movie to start playback
   - Use the player controls for fullscreen, aspect ratio, etc.
   - Enable Theatre Mode for distraction-free viewing

5. **Manage Favorites**
   - Click the heart icon to add channels/categories to favorites
   - Access favorites from the dedicated tab

## Configuration

### IPTV Provider Setup

The application supports any IPTV provider that uses the Xtream Codes API format. You'll need:

- **Server URL**: Your provider's server address
- **Username**: Your account username
- **Password**: Your account password

### Application Settings

- **Dark/Light Mode**: Toggle in the header
- **View Modes**: Switch between grid and list views
- **Player Settings**: Adjust aspect ratio, enable subtitles
- **Theatre Mode**: Full-screen viewing experience

## Keyboard Shortcuts

- **F11**: Toggle fullscreen
- **Ctrl+R**: Reload application
- **F12**: Toggle developer tools
- **Ctrl+Q**: Quit application
- **Ctrl+0**: Reset zoom
- **Ctrl++**: Zoom in
- **Ctrl+-**: Zoom out

## Troubleshooting

### Common Issues

1. **Login Failed**
   - Verify your credentials are correct
   - Check if the server URL includes the port number
   - Ensure your internet connection is stable

2. **Playback Issues**
   - Try refreshing the application (Ctrl+R)
   - Check if the stream URL is accessible
   - Verify your internet connection speed

3. **Performance Issues**
   - Close other applications to free up system resources
   - Try reducing the video quality if available
   - Restart the application

### Debug Mode

To enable debug mode, press F12 to open developer tools and check the console for error messages.

## Technical Details

### Built With

- **Electron**: Desktop application framework
- **HTML5/CSS3**: Modern web technologies
- **JavaScript**: Application logic
- **HLS.js**: HTTP Live Streaming support
- **Font Awesome**: Icons

### System Requirements

- **OS**: Windows 10 or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for application
- **Network**: Broadband internet connection

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please check the troubleshooting section above or contact your IPTV provider for service-related questions.

---

**Note**: This application is designed to work with legitimate IPTV services. Please ensure you have proper authorization to access the content you're streaming.