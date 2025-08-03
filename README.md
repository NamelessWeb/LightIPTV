# LightIPTV Player

A lightweight, browser-based IPTV player designed for optimal performance with large datasets and seamless user experience across devices.

## Features

### 🔐 Authentication
- **Xtream Credentials Login**: Secure authentication using your IPTV provider's Xtream API credentials
- **Auto-save Credentials**: Remembers login details for quick access
- **Connection Validation**: Tests server connectivity before proceeding

### 📺 Content Management
- **Live TV Channels**: Browse and watch live television channels
- **Movies (VOD)**: Access video-on-demand movie library
- **TV Series**: Watch episodic content with season/episode navigation
- **Dynamic Categories**: Automatically adapts to your provider's category structure
- **Country & Sports Groups**: Organized content by geographical regions and sports categories

### ⚡ Performance Optimizations
- **Virtual Scrolling**: Efficiently handles 20,000+ channels without performance degradation
- **Lazy Loading**: Loads content progressively as needed
- **Infinite Scroll**: Seamless browsing experience with automatic content loading
- **Optimized Rendering**: Uses CSS containment and will-change properties for smooth animations
- **Memory Management**: Efficient data structures to minimize memory usage

### 🎨 User Interface
- **Clean, Minimal Design**: Focus on content with distraction-free interface
- **Responsive Layout**: Adapts to desktop, tablet, and mobile devices
- **Grid & List Views**: Toggle between visual grid and compact list layouts
- **Real-time Search**: Instant filtering across all content types
- **Smooth Animations**: Polished transitions and hover effects

### 🔍 Navigation & Discovery
- **Category Browsing**: Organized content by provider-defined categories
- **Search Functionality**: Find channels, movies, and series quickly
- **Now Playing Info**: Display current content details
- **Visual Indicators**: Channel logos, category counts, and status indicators

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Valid Xtream API credentials from your IPTV provider
- Internet connection

### Setup

1. **Download/Clone** the project files to your local machine
2. **Open** `index.html` in your web browser
3. **Enter Credentials**:
   - Server URL (e.g., `http://your-provider.com:8080`)
   - Username
   - Password
4. **Click Connect** to authenticate and load your content

### Usage

#### First Time Setup
1. Launch the application in your browser
2. Enter your Xtream API credentials in the login form
3. Wait for content to load (this may take a moment for large libraries)
4. Browse categories and start watching!

#### Navigation
- **Switch Content Types**: Use Live TV, Movies, or Series tabs
- **Browse Categories**: Click on categories in the left sidebar
- **Search Content**: Use the search box to find specific channels/content
- **Change View**: Toggle between grid and list views using the view controls
- **Play Content**: Click on any channel or movie to start playback

#### Playback
- Video player supports standard HTML5 controls
- Automatic quality adaptation based on connection
- Error handling for failed streams
- Now playing information display

## Technical Details

### Architecture
- **Frontend Only**: Pure HTML5, CSS3, and JavaScript (ES6+)
- **No Dependencies**: No external frameworks or libraries required
- **Modular Design**: Clean separation of concerns with class-based architecture
- **API Integration**: Direct integration with Xtream API endpoints

### Performance Features
- **Pagination**: Loads content in chunks of 50 items
- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Efficient DOM Updates**: Minimal DOM manipulation for smooth performance
- **Memory Optimization**: Proper cleanup and garbage collection
- **Caching Strategy**: Stores frequently accessed data in memory

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Security
- Credentials stored locally using localStorage
- No server-side storage of sensitive information
- HTTPS recommended for production use
- Input validation and sanitization

## API Endpoints Used

The application integrates with standard Xtream API endpoints:

- `player_api.php` - Authentication and user info
- `get_live_categories` - Live TV categories
- `get_live_streams` - Live TV channels
- `get_vod_categories` - Movie categories
- `get_vod_streams` - Movie library
- `get_series_categories` - Series categories
- `get_series` - TV series library
- `get_series_info` - Episode information

## Troubleshooting

### Common Issues

**Login Failed**
- Verify server URL format (include http:// or https://)
- Check username and password
- Ensure server is accessible from your network
- Try removing trailing slashes from server URL

**Content Not Loading**
- Check internet connection
- Verify IPTV service is active
- Clear browser cache and try again
- Check browser console for error messages

**Video Playback Issues**
- Ensure browser supports HLS (m3u8) playback
- Check if content requires specific codecs
- Try different channels to isolate the issue
- Disable browser extensions that might interfere

**Performance Issues**
- Close other browser tabs to free memory
- Use latest browser version
- Check available system memory
- Consider using grid view for better performance with large lists

### Browser Console
Open browser developer tools (F12) to view detailed error messages and network requests for debugging.

## Customization

### Styling
Modify `styles.css` to customize:
- Color scheme and themes
- Layout dimensions
- Animation timings
- Responsive breakpoints

### Functionality
Edit `script.js` to adjust:
- Items per page (default: 50)
- Search delay (default: 300ms)
- Request timeout (default: 15 seconds)
- Auto-play behavior

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Support

For issues related to:
- **IPTV Service**: Contact your IPTV provider
- **Application Bugs**: Check browser console for errors
- **Feature Requests**: Consider contributing to the project

---

**Note**: This application requires valid IPTV service credentials. It does not provide or include any IPTV content or services.