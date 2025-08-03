class LightIPTV {
    constructor() {
        this.apiCredentials = null;
        this.currentData = {
            live: [],
            movies: [],
            series: [],
            favorites: []
        };
        this.currentCategory = null;
        this.currentType = 'live';
        this.currentChannels = [];
        this.filteredChannels = [];
        this.currentPage = 0;
        this.itemsPerPage = 50;
        this.isLoading = false;
        this.searchTimeout = null;
        this.categorySearchTimeout = null;
        this.favoriteChannels = new Set();
        this.favoriteCategories = new Set();
        this.hls = null;
        this.isResizing = false;
        this.popoutWindow = null;
        this.sidebarCollapsed = false;
        this.overlayTimeout = null;
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.isTheatreMode = false;
        this.theatreHoverTimeout = null;
        this.favoritesHoverTimeout = null;
        this.currentResolution = 'unknown';
        this.currentFPS = 'unknown';
        this.currentAspectRatio = '16:9';
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.subtitles = [];
        this.currentSubtitle = null;
        this.subtitleOffset = 0; // Offset in milliseconds
        this.currentChannel = null;
        this.loadFavorites();
        this.loadCachedData();
        this.init();
        this.initializeDarkMode();
        this.initializeSubtitles();
    }

    init() {
        this.bindEvents();
        this.checkSavedCredentials();
    }

    loadFavorites() {
        const savedChannels = localStorage.getItem('iptv_favorite_channels');
        const savedCategories = localStorage.getItem('iptv_favorite_categories');
        
        if (savedChannels) {
            try {
                this.favoriteChannels = new Set(JSON.parse(savedChannels));
            } catch (e) {
                this.favoriteChannels = new Set();
            }
        }
        
        if (savedCategories) {
            try {
                this.favoriteCategories = new Set(JSON.parse(savedCategories));
            } catch (e) {
                this.favoriteCategories = new Set();
            }
        }
    }

    renderFavoriteChannels() {
        const favoriteChannelsList = document.getElementById('favoriteChannelsList');
        favoriteChannelsList.innerHTML = '';
        
        // Get all favorite channels from current favorites data
        const favoriteChannels = this.currentData.favorites || [];
        const channelCategories = favoriteChannels.filter(cat => cat.id === 'favorite_channels');
        
        if (channelCategories.length > 0 && channelCategories[0].items.length > 0) {
            channelCategories[0].items.forEach(channel => {
                const item = document.createElement('div');
                item.className = 'favorite-item';
                
                item.innerHTML = `
                    <span class="favorite-name">${channel.name}</span>
                    <button class="favorite-remove-btn" title="Remove from favorites">
                        <i class="fas fa-star"></i>
                    </button>
                `;
                
                // Add click handler for remove button
                const removeBtn = item.querySelector('.favorite-remove-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleChannelFavorite(channel);
                    this.renderFavoriteChannels(); // Refresh the list
                });
                
                item.addEventListener('click', () => {
                    this.playChannel(channel, item);
                });
                
                favoriteChannelsList.appendChild(item);
            });
        } else {
            favoriteChannelsList.innerHTML = '<div class="favorite-item" style="opacity: 0.6; cursor: default;">No favorite channels</div>';
        }
    }

    renderFavoriteCategories() {
        const favoriteCategoriesList = document.getElementById('favoriteCategoriesList');
        favoriteCategoriesList.innerHTML = '';
        
        // Get favorite categories from all types
        const favoriteCategories = [];
        
        ['live', 'movies', 'series'].forEach(type => {
            if (this.currentData[type]) {
                this.currentData[type].forEach(category => {
                    const categoryKey = `${type}_${category.id}`;
                    if (this.favoriteCategories.has(categoryKey)) {
                        favoriteCategories.push({
                            ...category,
                            type: type,
                            displayType: type.charAt(0).toUpperCase() + type.slice(1)
                        });
                    }
                });
            }
        });
        
        if (favoriteCategories.length > 0) {
            favoriteCategories.forEach(category => {
                const item = document.createElement('div');
                item.className = 'favorite-item';
                
                item.innerHTML = `
                    <span class="favorite-name">${category.name}</span>
                    <div class="favorite-actions">
                        <span class="favorite-type">${category.displayType}</span>
                        <button class="favorite-remove-btn" title="Remove from favorites">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                `;
                
                // Add click handler for remove button
                const removeBtn = item.querySelector('.favorite-remove-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleCategoryFavorite(category);
                    this.renderFavoriteCategories(); // Refresh the list
                });
                
                item.addEventListener('click', () => {
                    // Switch to the appropriate tab and select the category
                    this.switchTab(category.type);
                    setTimeout(() => {
                        this.selectCategory(category);
                    }, 100);
                });
                
                favoriteCategoriesList.appendChild(item);
            });
        } else {
            favoriteCategoriesList.innerHTML = '<div class="favorite-item" style="opacity: 0.6; cursor: default;">No favorite categories</div>';
        }
    }

    saveFavorites() {
        localStorage.setItem('iptv_favorite_channels', JSON.stringify([...this.favoriteChannels]));
        localStorage.setItem('iptv_favorite_categories', JSON.stringify([...this.favoriteCategories]));
    }

    toggleChannelFavorite(channel) {
        const channelId = this.getChannelId(channel);
        
        if (this.favoriteChannels.has(channelId)) {
            this.favoriteChannels.delete(channelId);
        } else {
            this.favoriteChannels.add(channelId);
        }
        
        this.saveFavorites();
        this.updateFavoritesData();
        
        // Update UI if we're in favorites view
        if (this.currentType === 'favorites') {
            this.renderCategories();
            if (this.currentCategory && this.currentCategory.id === 'favorite_channels') {
                this.selectCategory(this.currentCategory);
            }
        }
    }

    toggleCategoryFavorite(category) {
        const categoryKey = `${this.currentType}_${category.id}`;
        
        // Save current scroll position
        const categoryList = document.getElementById('regularCategoryList') || document.getElementById('categoryList');
        const scrollTop = categoryList ? categoryList.scrollTop : 0;
        
        if (this.favoriteCategories.has(categoryKey)) {
            this.favoriteCategories.delete(categoryKey);
        } else {
            this.favoriteCategories.add(categoryKey);
        }
        
        this.saveFavorites();
        this.renderCategories();
        
        // Restore scroll position after a brief delay to allow rendering
        setTimeout(() => {
            if (categoryList) {
                categoryList.scrollTop = scrollTop;
            }
        }, 10);
    }

    getChannelId(channel) {
        const type = channel.originalType || this.currentType;
        return `${type}_${channel.stream_id || channel.series_id || channel.id}`;
    }

    detectResolution(width, height) {
        if (!width || !height) return 'unknown';
        
        if (width >= 1920 && height >= 1080) {
            return 'fhd';
        } else if (width >= 1280 && height >= 720) {
            return 'hd';
        } else {
            return 'sd';
        }
    }

    detectFPS(channel) {
        // Try to extract FPS from channel name or stream info
        const channelName = channel.name || '';
        const streamInfo = channel.stream_info || '';
        const combinedText = `${channelName} ${streamInfo}`.toLowerCase();
        
        // Look for FPS indicators in the text
        if (combinedText.includes('60fps') || combinedText.includes('60 fps')) {
            return '60';
        } else if (combinedText.includes('50fps') || combinedText.includes('50 fps')) {
            return '50';
        } else if (combinedText.includes('30fps') || combinedText.includes('30 fps')) {
            return '30';
        } else if (combinedText.includes('25fps') || combinedText.includes('25 fps')) {
            return '25';
        } else {
            // Default assumption for live TV
            return '25';
        }
    }

    updateResolutionIndicator(resolution = null) {
        const resolutionBadge = document.getElementById('resolutionBadge');
        const resolutionIndicator = document.getElementById('resolutionIndicator');
        
        if (!resolutionBadge || !resolutionIndicator) return;
        
        const currentRes = resolution || this.currentResolution;
        
        // Remove all resolution classes
        resolutionBadge.classList.remove('sd', 'hd', 'fhd', 'unknown');
        
        // Add current resolution class and update text
        switch (currentRes) {
            case 'fhd':
                resolutionBadge.textContent = 'FHD';
                resolutionBadge.classList.add('fhd');
                break;
            case 'hd':
                resolutionBadge.textContent = 'HD';
                resolutionBadge.classList.add('hd');
                break;
            case 'sd':
                resolutionBadge.textContent = 'SD';
                resolutionBadge.classList.add('sd');
                break;
            default:
                resolutionBadge.textContent = '?';
                resolutionBadge.classList.add('unknown');
        }
        
        this.currentResolution = currentRes;
        
        // Show the indicator
        resolutionIndicator.style.display = 'flex';
    }

    updateFPSIndicator(fps = null) {
        const fpsBadge = document.getElementById('fpsBadge');
        
        if (fpsBadge) {
            const displayFPS = fps || this.currentFPS;
            fpsBadge.textContent = `${displayFPS} FPS`;
            
            console.log(`FPS indicator updated to: ${displayFPS}`);
        }
    }

    hideResolutionIndicator() {
        const resolutionIndicator = document.getElementById('resolutionIndicator');
        if (resolutionIndicator) {
            resolutionIndicator.style.display = 'none';
        }
    }

    setAspectRatio(ratio) {
        const videoPlayer = document.getElementById('videoPlayer');
        const playerContainer = document.getElementById('playerContainer');
        
        if (!videoPlayer || !playerContainer) return;
        
        this.currentAspectRatio = ratio;
        
        // Update active button
        document.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        let activeBtn;
        switch (ratio) {
            case '16:9':
                activeBtn = document.getElementById('aspectRatio169');
                videoPlayer.style.aspectRatio = '16/9';
                break;
            case '21:9':
                activeBtn = document.getElementById('aspectRatio219');
                videoPlayer.style.aspectRatio = '21/9';
                break;
            case '4:3':
                activeBtn = document.getElementById('aspectRatio43');
                videoPlayer.style.aspectRatio = '4/3';
                break;
        }
        
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Ensure video maintains aspect ratio
        videoPlayer.style.width = '100%';
        videoPlayer.style.height = 'auto';
        videoPlayer.style.maxHeight = '100%';
        videoPlayer.style.objectFit = 'contain';
        
        console.log(`Aspect ratio changed to ${ratio}`);
    }

    initializeDarkMode() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        this.updateDarkModeButton();
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        localStorage.setItem('darkMode', this.isDarkMode.toString());
        this.updateDarkModeButton();
    }

    updateDarkModeButton() {
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (darkModeBtn) {
            const icon = darkModeBtn.querySelector('i');
            const text = darkModeBtn.childNodes[darkModeBtn.childNodes.length - 1];
            
            if (this.isDarkMode) {
                icon.className = 'fas fa-moon';
                text.textContent = ' Dark Mode';
            } else {
                icon.className = 'fas fa-sun';
                text.textContent = ' Light Mode';
            }
        }
    }

    updateFavoritesData() {
        const favoriteChannels = [];
        
        // Collect favorite channels from all types
        ['live', 'movies', 'series'].forEach(type => {
            this.currentData[type].forEach(category => {
                category.items.forEach(channel => {
                    const channelId = `${type}_${channel.stream_id || channel.series_id || channel.id}`;
                    if (this.favoriteChannels.has(channelId)) {
                        favoriteChannels.push({
                            ...channel,
                            originalType: type,
                            originalCategory: category.name
                        });
                    }
                });
            });
        });
        
        this.currentData.favorites = [{
            id: 'favorite_channels',
            name: 'Favorite Channels',
            items: favoriteChannels
        }];
    }

    showFavoriteChannelsInPanel() {
        const channelList = document.getElementById('channelList');
        channelList.innerHTML = '';
        
        // Get favorite channels
        const favoriteChannels = [];
        ['live', 'movies', 'series'].forEach(type => {
            if (this.currentData[type]) {
                this.currentData[type].forEach(category => {
                    if (category.items) {
                        category.items.forEach(channel => {
                            const channelId = this.getChannelId(channel);
                            if (this.favoriteChannels.has(channelId)) {
                                favoriteChannels.push({...channel, originalType: type});
                            }
                        });
                    }
                });
            }
        });
        
        if (favoriteChannels.length === 0) {
            channelList.innerHTML = `
                <div class="no-channels">
                    <i class="fas fa-heart"></i>
                    <p>No favorite channels yet</p>
                    <p>Add channels to favorites by clicking the heart icon</p>
                </div>
            `;
            return;
        }
        
        // Display favorite channels
        this.currentChannels = favoriteChannels;
        this.filteredChannels = favoriteChannels;
        
        favoriteChannels.forEach(channel => {
            const channelItem = this.createChannelItem(channel);
            channelList.appendChild(channelItem);
        });
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Resync button
        document.getElementById('resyncBtn').addEventListener('click', () => {
            this.resyncData();
        });

        // Category tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.type);
            });
        });

        // Search inputs
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleChannelSearch(e.target.value);
        });
        
        document.getElementById('categorySearchInput').addEventListener('input', (e) => {
            this.handleCategorySearch(e.target.value);
        });

        // View controls
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setViewMode('grid');
        });
        
        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.setViewMode('list');
        });

        // Infinite scroll for channel list
        document.getElementById('channelList').addEventListener('scroll', (e) => {
            this.handleScroll(e);
        });

        // Player controls
        document.getElementById('resizeBtn').addEventListener('click', () => {
            this.toggleResizeMode();
        });

        document.getElementById('popoutBtn').addEventListener('click', () => {
            this.popoutPlayer();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Theatre mode button
        document.getElementById('theatreModeBtn').addEventListener('click', () => {
            this.toggleTheatreMode();
        });

        // Exit theatre mode button
        document.getElementById('exitTheatreBtn').addEventListener('click', () => {
            this.exitTheatreMode();
        });

        // Resize handle
        this.initializeResizeHandle();
        
        // Initialize drag functionality
        this.initializeDragFunctionality();

        // Sidebar collapse/expand
        document.getElementById('collapseBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('expandBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Collapsed tab clicks
        document.querySelectorAll('.collapsed-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.switchTab(type);
                this.updateCollapsedTabState(type);
            });
        });

        // Channel hover overlay
        this.initializeChannelHoverOverlay();

        // Theatre mode hover functionality
        this.initializeTheatreHover();

        // Aspect ratio controls
        document.getElementById('aspectRatio169')?.addEventListener('click', () => this.setAspectRatio('16:9'));
        document.getElementById('aspectRatio219')?.addEventListener('click', () => this.setAspectRatio('21:9'));
        document.getElementById('aspectRatio43')?.addEventListener('click', () => this.setAspectRatio('4:3'));

        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());

        // Subtitle controls
        document.getElementById('subtitleBtn')?.addEventListener('click', () => {
            this.openSubtitleModal();
        });

        document.getElementById('importSubtitleBtn')?.addEventListener('click', () => {
            document.getElementById('subtitleFileInput').click();
        });

        // Subtitle indicator controls (next to HD/FPS badges)
        document.getElementById('subtitleIndicatorBtn')?.addEventListener('click', () => {
            this.openSubtitleModal();
        });

        document.getElementById('importSubtitleIndicatorBtn')?.addEventListener('click', () => {
            document.getElementById('subtitleFileInput').click();
        });

        document.getElementById('closeSubtitleModal')?.addEventListener('click', () => {
            this.closeSubtitleModal();
        });

        document.getElementById('subtitleFileInput')?.addEventListener('change', (e) => {
            this.handleSubtitleFileImport(e);
        });

        document.getElementById('selectFileBtn')?.addEventListener('click', () => {
            document.getElementById('subtitleFileInput').click();
        });

        document.getElementById('searchSubtitlesBtn')?.addEventListener('click', () => {
            this.searchOpenSubtitles();
        });

        document.getElementById('subtitleSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchOpenSubtitles();
            }
        });

        // Removed API key configuration - no longer needed for free sources

        // Close modal when clicking outside
        document.getElementById('subtitleModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'subtitleModal') {
                this.closeSubtitleModal();
            }
        });

        // Removed favorites popup as it was problematic when panels are collapsed
        // this.initializeFavoritesPopup();
    }

    checkSavedCredentials() {
        const saved = localStorage.getItem('iptv_credentials');
        if (saved) {
            try {
                this.apiCredentials = JSON.parse(saved);
                this.showLoadingScreen('Connecting with saved credentials...');
                this.loadData();
            } catch (e) {
                localStorage.removeItem('iptv_credentials');
            }
        }
    }

    async handleLogin() {
        const server = document.getElementById('server').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!server || !username || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        // Normalize server URL
        const normalizedServer = server.endsWith('/') ? server.slice(0, -1) : server;
        
        this.apiCredentials = {
            server: normalizedServer,
            username,
            password
        };

        this.showLoadingScreen('Connecting to server...');
        
        try {
            // Test connection with player_api.php
            const testUrl = `${normalizedServer}/player_api.php?username=${username}&password=${password}`;
            const response = await this.fetchWithTimeout(testUrl, 10000);
            
            if (!response.ok) {
                throw new Error('Invalid credentials or server not reachable');
            }

            const data = await response.json();
            
            if (data.user_info && data.user_info.status === 'Active') {
                // Save credentials
                localStorage.setItem('iptv_credentials', JSON.stringify(this.apiCredentials));
                this.hideError();
                await this.loadData();
            } else {
                throw new Error('Invalid credentials or inactive account');
            }
        } catch (error) {
            this.showError(error.message);
            this.showLoginScreen();
        }
    }

    loadCachedData() {
        try {
            const cachedData = localStorage.getItem('iptv_cached_data');
            const cacheTimestamp = localStorage.getItem('iptv_cache_timestamp');
            
            if (cachedData && cacheTimestamp) {
                const now = Date.now();
                const cacheAge = now - parseInt(cacheTimestamp);
                
                if (cacheAge < this.cacheExpiry) {
                    const data = JSON.parse(cachedData);
                    this.currentData = data;
                    console.log('Loaded data from cache');
                    return true;
                }
            }
        } catch (error) {
            console.error('Error loading cached data:', error);
        }
        return false;
    }

    saveCachedData() {
        try {
            // Create a compressed version of the data for caching
            const compressedData = {
                live: this.currentData.live.map(category => ({
                    id: category.id,
                    name: category.name,
                    items: category.items.slice(0, 100).map(item => ({
                        stream_id: item.stream_id,
                        name: item.name,
                        stream_icon: item.stream_icon,
                        category_id: item.category_id,
                        originalType: item.originalType,
                        originalCategory: item.originalCategory
                    }))
                })),
                movies: this.currentData.movies.map(category => ({
                    id: category.id,
                    name: category.name,
                    items: category.items.slice(0, 50).map(item => ({
                        stream_id: item.stream_id,
                        name: item.name,
                        stream_icon: item.stream_icon,
                        category_id: item.category_id,
                        container_extension: item.container_extension,
                        originalType: item.originalType,
                        originalCategory: item.originalCategory
                    }))
                })),
                series: this.currentData.series.map(category => ({
                    id: category.id,
                    name: category.name,
                    items: category.items.slice(0, 50).map(item => ({
                        series_id: item.series_id,
                        name: item.name,
                        cover: item.cover,
                        category_id: item.category_id,
                        originalType: item.originalType,
                        originalCategory: item.originalCategory
                    }))
                })),
                favorites: this.currentData.favorites
            };
            
            const dataString = JSON.stringify(compressedData);
            
            // Check if data size is reasonable (less than 4MB)
            if (dataString.length > 4 * 1024 * 1024) {
                console.warn('Cache data too large, skipping cache');
                return;
            }
            
            localStorage.setItem('iptv_cached_data', dataString);
            localStorage.setItem('iptv_cache_timestamp', Date.now().toString());
            console.log('Data cached successfully');
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded, clearing old cache and retrying with minimal data');
                this.clearCachedData();
                
                // Try to save minimal essential data only
                try {
                    const minimalData = {
                        live: this.currentData.live.slice(0, 10).map(category => ({
                            id: category.id,
                            name: category.name,
                            items: category.items.slice(0, 20).map(item => ({
                                stream_id: item.stream_id,
                                name: item.name,
                                originalType: item.originalType
                            }))
                        })),
                        movies: [],
                        series: [],
                        favorites: this.currentData.favorites
                    };
                    
                    localStorage.setItem('iptv_cached_data', JSON.stringify(minimalData));
                    localStorage.setItem('iptv_cache_timestamp', Date.now().toString());
                    console.log('Minimal data cached successfully');
                } catch (retryError) {
                    console.error('Failed to cache even minimal data:', retryError);
                }
            } else {
                console.error('Error caching data:', error);
            }
        }
    }

    clearCachedData() {
        localStorage.removeItem('iptv_cached_data');
        localStorage.removeItem('iptv_cache_timestamp');
        console.log('Cache cleared');
    }

    async resyncData() {
        const resyncBtn = document.getElementById('resyncBtn');
        resyncBtn.disabled = true;
        resyncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        
        try {
            this.clearCachedData();
            this.currentData = { live: [], movies: [], series: [], favorites: [] };
            await this.loadData(true); // Force reload
            
        } catch (error) {
            console.error('Error during resync:', error);
            this.showError('Failed to resync data. Please try again.');
        } finally {
            resyncBtn.disabled = false;
            resyncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Resync';
        }
    }

    async loadData(forceReload = false) {
        try {
            // Check if we have cached data and don't need to reload
            if (!forceReload && this.loadCachedData() && 
                this.currentData.live && this.currentData.live.length > 0) {
                console.log('Using cached data, skipping API calls');
                this.hideAllScreens();
                this.showPlayerScreen();
                this.updateFavoritesData();
                
                const defaultTab = this.favoriteChannels.size > 0 ? 'favorites' : 'live';
                this.switchTab(defaultTab);
                return;
            }
            
            console.log('Loading fresh data from API');
            this.showLoadingScreen('Loading content...');
            
            this.updateLoadingStatus('Loading live channels...');
            await this.loadLiveChannels();
            
            this.updateLoadingStatus('Loading movies...');
            await this.loadMovies();
            
            this.updateLoadingStatus('Loading series...');
            await this.loadSeries();
            
            // Cache the loaded data
            this.saveCachedData();
            
            this.updateFavoritesData();
            this.hideAllScreens();
            this.showPlayerScreen();
            // Set favorites tab as default if user has favorites, otherwise live
            const defaultTab = this.favoriteChannels.size > 0 ? 'favorites' : 'live';
            this.switchTab(defaultTab);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load content. Please check your connection.');
            this.showLoginScreen();
        }
    }

    async loadLiveChannels() {
        const url = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_live_categories`;
        const categoriesResponse = await this.fetchWithTimeout(url);
        const categories = await categoriesResponse.json();

        const channelsUrl = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_live_streams`;
        const channelsResponse = await this.fetchWithTimeout(channelsUrl);
        const channels = await channelsResponse.json();

        // Group channels by category
        const groupedChannels = this.groupByCategory(channels, categories, 'category_id');
        this.currentData.live = groupedChannels;
    }

    async loadMovies() {
        try {
            const url = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_vod_categories`;
            const categoriesResponse = await this.fetchWithTimeout(url);
            const categories = await categoriesResponse.json();

            const moviesUrl = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_vod_streams`;
            const moviesResponse = await this.fetchWithTimeout(moviesUrl);
            const movies = await moviesResponse.json();

            const groupedMovies = this.groupByCategory(movies, categories, 'category_id');
            this.currentData.movies = groupedMovies;
        } catch (error) {
            console.warn('Movies not available:', error);
            this.currentData.movies = [];
        }
    }

    async loadSeries() {
        try {
            const url = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_series_categories`;
            const categoriesResponse = await this.fetchWithTimeout(url);
            const categories = await categoriesResponse.json();

            const seriesUrl = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_series`;
            const seriesResponse = await this.fetchWithTimeout(seriesUrl);
            const series = await seriesResponse.json();

            const groupedSeries = this.groupByCategory(series, categories, 'category_id');
            this.currentData.series = groupedSeries;
        } catch (error) {
            console.warn('Series not available:', error);
            this.currentData.series = [];
        }
    }

    groupByCategory(items, categoryList, categoryField) {
        const categoryMap = new Map();
        
        // Create category map
        categoryList.forEach(cat => {
            categoryMap.set(cat.category_id, {
                id: cat.category_id,
                name: cat.category_name,
                items: []
            });
        });

        // Add uncategorized category
        categoryMap.set('uncategorized', {
            id: 'uncategorized',
            name: 'Uncategorized',
            items: []
        });

        // Group items by category
        items.forEach(item => {
            const categoryId = item[categoryField] || 'uncategorized';
            const category = categoryMap.get(categoryId);
            if (category) {
                category.items.push(item);
            }
        });

        // Convert to array and filter empty categories
        const categories = Array.from(categoryMap.values())
            .filter(cat => cat.items.length > 0);
            
        // Keep original order, no automatic sorting by favorites
        return categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    switchTab(type) {
        this.currentType = type;
        this.currentCategory = null;
        this.currentPage = 0;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // Update collapsed tab state if sidebar is collapsed
        if (this.sidebarCollapsed) {
            this.updateCollapsedTabState(type);
        }

        // Update panel title
        const titles = {
            favorites: 'Favorites',
            live: 'Live Channels',
            movies: 'Movies',
            series: 'TV Series'
        };
        document.getElementById('panelTitle').textContent = titles[type];

        // Update favorites data if switching to favorites
        if (type === 'favorites') {
            this.updateFavoritesData();
        }
        
        // Always render categories to show proper sidebar content
        this.renderCategories();
        
        if (type === 'favorites') {
            // Show favorite channels directly in the channel panel
            this.showFavoriteChannelsInPanel();
        } else {
            this.clearChannelList();
        }
    }

    renderCategories() {
        const favoritesSection = document.getElementById('favoritesSection');
        const regularCategoryList = document.getElementById('regularCategoryList');
        const categories = this.currentData[this.currentType] || [];
        
        if (this.currentType === 'favorites') {
            // Show favorites section and hide regular categories
            favoritesSection.style.display = 'block';
            regularCategoryList.innerHTML = '';
            
            this.renderFavoriteChannels();
            this.renderFavoriteCategories();
        } else {
            // Hide favorites section and show regular categories
            favoritesSection.style.display = 'none';
            regularCategoryList.innerHTML = '';
            
            categories.forEach(category => {
                const item = document.createElement('div');
                const categoryKey = `${this.currentType}_${category.id}`;
                const isFavorite = this.favoriteCategories.has(categoryKey);
                
                item.className = `category-item ${isFavorite ? 'favorite' : ''}`;
                item.setAttribute('data-category-id', category.id);
                
                const favoriteButton = `<button class="category-favorite ${isFavorite ? 'active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-star"></i>
                    </button>`;
                
                item.innerHTML = `
                    <span class="category-name">${category.name}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="category-count">${category.items.length}</span>
                        ${favoriteButton}
                    </div>
                `;
                
                // Add click handler for category selection
                const categoryName = item.querySelector('.category-name');
                categoryName.addEventListener('click', (e) => {
                    this.selectCategory(category, e.target);
                });
                
                // Also add click handler to the entire item (except favorite button)
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.category-favorite')) {
                        this.selectCategory(category, e.currentTarget);
                    }
                });
                
                // Add click handler for favorite button
                const favBtn = item.querySelector('.category-favorite');
                if (favBtn) {
                    favBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleCategoryFavorite(category);
                    });
                }
                
                regularCategoryList.appendChild(item);
            });
        }
    }

    selectCategory(category, clickedElement = null) {
        this.currentCategory = category;
        this.currentChannels = category.items || [];
        this.filteredChannels = [...this.currentChannels];
        this.currentPage = 0;
        
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and activate the correct category item
        if (clickedElement) {
            const categoryItem = clickedElement.closest('.category-item');
            if (categoryItem) {
                categoryItem.classList.add('active');
            }
        } else {
            // Fallback: find by category id
            const categoryItem = document.querySelector(`[data-category-id="${category.id}"]`);
            if (categoryItem) {
                categoryItem.classList.add('active');
            }
        }
        
        // Clear channel list and render new channels
        this.clearChannelList();
        
        // Add a small delay to ensure proper rendering
        setTimeout(() => {
            this.renderChannels();
        }, 50);
    }

    renderChannels() {
        const channelList = document.getElementById('channelList');
        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const channelsToShow = this.filteredChannels.slice(0, endIndex);
        
        if (this.currentPage === 0) {
            channelList.innerHTML = '';
        }
        
        channelsToShow.slice(startIndex).forEach(channel => {
            const item = this.createChannelItem(channel);
            channelList.appendChild(item);
        });
        
        this.currentPage++;
    }

    createChannelItem(channel) {
        const item = document.createElement('div');
        const channelId = this.getChannelId(channel);
        const isFavorite = this.favoriteChannels.has(channelId);
        
        item.className = `channel-item fade-in ${isFavorite ? 'favorite' : ''}`;
        item.setAttribute('data-channel-id', channel.stream_id || channel.series_id || channel.id);
        
        const logoUrl = channel.stream_icon || '';
        const name = channel.name || 'Unknown';
        const category = channel.originalCategory || this.currentCategory?.name || '';
        
        const favoriteButton = `
            <button class="channel-favorite ${isFavorite ? 'active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="fas fa-star"></i>
            </button>
        `;
        
        item.innerHTML = `
            <img class="channel-logo" src="${logoUrl}" alt="${name}" onerror="this.style.display='none'">
            <div class="channel-info">
                <div class="channel-name" title="${name}">${name}</div>
                <div class="channel-category">${category}</div>
            </div>
            ${favoriteButton}
        `;
        
        // Add click handler for channel playback
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.channel-favorite')) {
                this.playChannel(channel, e.currentTarget);
            }
        });
        
        // Add click handler for favorite button
        const favBtn = item.querySelector('.channel-favorite');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChannelFavorite(channel);
            
            // Update button state immediately
            const isNowFavorite = this.favoriteChannels.has(channelId);
            favBtn.classList.toggle('active', isNowFavorite);
            item.classList.toggle('favorite', isNowFavorite);
            favBtn.title = isNowFavorite ? 'Remove from favorites' : 'Add to favorites';
        });
        
        return item;
    }

    async playChannel(channel, clickedElement = null) {
        const videoPlayer = document.getElementById('videoPlayer');
        const playerOverlay = document.getElementById('playerOverlay');
        const nowPlayingInfo = document.getElementById('nowPlayingInfo');
        
        // Store current channel for subtitle functionality
        this.currentChannel = channel;
        this.clearSubtitles();
        
        console.log('Playing channel:', channel.name, 'Type:', channel.originalType || this.currentType);
        
        // Update active channel
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (clickedElement) {
            const channelItem = clickedElement.closest('.channel-item');
            if (channelItem) {
                channelItem.classList.add('active');
            }
        }
        
        // Update now playing info
        nowPlayingInfo.innerHTML = `
            <h4>${channel.name}</h4>
            <p>${this.currentCategory?.name || 'Unknown Category'}</p>
        `;
        
        // Reset resolution and FPS indicators
        this.currentResolution = 'unknown';
        this.currentFPS = this.detectFPS(channel);
        this.updateResolutionIndicator('unknown');
        this.updateFPSIndicator(this.currentFPS);
        
        try {
            let streamUrl;
            const channelType = channel.originalType || this.currentType;
            
            if (channelType === 'live') {
                streamUrl = `${this.apiCredentials.server}/live/${this.apiCredentials.username}/${this.apiCredentials.password}/${channel.stream_id}.m3u8`;
                // Check for provider subtitles for live content
                this.checkProviderSubtitles(channel);
            } else if (channelType === 'movies') {
                streamUrl = `${this.apiCredentials.server}/movie/${this.apiCredentials.username}/${this.apiCredentials.password}/${channel.stream_id}.${channel.container_extension || 'mp4'}`;
                // Check for provider subtitles for movie content
                this.checkProviderSubtitles(channel);
            } else if (channelType === 'series') {
                // For series, we need to get episodes first
                const episodesUrl = `${this.apiCredentials.server}/player_api.php?username=${this.apiCredentials.username}&password=${this.apiCredentials.password}&action=get_series_info&series_id=${channel.series_id}`;
                const episodesResponse = await this.fetchWithTimeout(episodesUrl);
                const episodesData = await episodesResponse.json();
                
                if (episodesData.episodes && Object.keys(episodesData.episodes).length > 0) {
                    // Play first episode of first season
                    const firstSeason = Object.keys(episodesData.episodes)[0];
                    const firstEpisode = episodesData.episodes[firstSeason][0];
                    streamUrl = `${this.apiCredentials.server}/series/${this.apiCredentials.username}/${this.apiCredentials.password}/${firstEpisode.id}.${firstEpisode.container_extension || 'mp4'}`;
                    
                    // Store episode data for subtitle checking
                    channel.currentEpisode = firstEpisode;
                    channel.episodesData = episodesData;
                    
                    // Check for provider subtitles after episode data is loaded
                    this.checkProviderSubtitles(channel);
                } else {
                    throw new Error('No episodes available');
                }
            }
            
            console.log('Generated stream URL:', streamUrl);
            
            // Clean up previous HLS instance
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }
            
            videoPlayer.poster = channel.stream_icon || '';
            playerOverlay.classList.add('hidden');
            
            // Check for embedded subtitle tracks after video loads
            this.checkEmbeddedSubtitles(videoPlayer, channel);
            
            // Use HLS.js for .m3u8 streams (Live TV)
            if (channelType === 'live' && streamUrl.includes('.m3u8')) {
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    this.hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: true,
                        backBufferLength: 90
                    });
                    this.hls.loadSource(streamUrl);
                    this.hls.attachMedia(videoPlayer);
                    
                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        videoPlayer.play();
                        // Detect resolution from HLS levels
                        if (this.hls.levels && this.hls.levels.length > 0) {
                            const highestLevel = this.hls.levels.reduce((prev, current) => 
                                (prev.height > current.height) ? prev : current
                            );
                            const resolution = this.detectResolution(highestLevel.width, highestLevel.height);
                            this.updateResolutionIndicator(resolution);
                        }
                    });
                    
                    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                        const level = this.hls.levels[data.level];
                        if (level) {
                            const resolution = this.detectResolution(level.width, level.height);
                            this.updateResolutionIndicator(resolution);
                        }
                    });
                    
                    this.hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS Error:', data);
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    this.showError('Network error: Unable to load stream');
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    this.showError('Media error: Stream format not supported');
                                    break;
                                default:
                                    this.showError('Fatal error: Unable to play stream');
                                    break;
                            }
                        }
                    });
                } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                    // Safari native HLS support
                    videoPlayer.src = streamUrl;
                    try {
                        await videoPlayer.play();
                    } catch (playError) {
                        console.warn('Auto-play prevented:', playError);
                    }
                } else {
                    throw new Error('HLS not supported in this browser');
                }
            } else {
                // Regular video files (Movies/Series)
                videoPlayer.src = streamUrl;
                try {
                    await videoPlayer.play();
                } catch (playError) {
                    console.warn('Auto-play prevented:', playError);
                }
            }
            
            // Add event listener for video metadata to detect resolution
            const handleLoadedMetadata = () => {
                if (videoPlayer.videoWidth && videoPlayer.videoHeight) {
                    const resolution = this.detectResolution(videoPlayer.videoWidth, videoPlayer.videoHeight);
                    this.updateResolutionIndicator(resolution);
                }
                videoPlayer.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
            
            videoPlayer.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            // Fallback: check resolution after a short delay
            setTimeout(() => {
                if (videoPlayer.videoWidth && videoPlayer.videoHeight && this.currentResolution === 'unknown') {
                    const resolution = this.detectResolution(videoPlayer.videoWidth, videoPlayer.videoHeight);
                    this.updateResolutionIndicator(resolution);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error playing channel:', error);
            console.error('Channel data:', channel);
            console.error('API credentials:', this.apiCredentials);
            this.showError(`Failed to load stream: ${error.message}`);
        }
    }

    handleChannelSearch(query) {
        clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(() => {
            if (!this.currentChannels.length) return;
            
            if (!query.trim()) {
                this.filteredChannels = [...this.currentChannels];
            } else {
                const searchTerm = query.toLowerCase();
                this.filteredChannels = this.currentChannels.filter(channel => 
                    channel.name.toLowerCase().includes(searchTerm)
                );
            }
            
            this.currentPage = 0;
            this.renderChannels();
        }, 300);
    }
    
    handleCategorySearch(query) {
        clearTimeout(this.categorySearchTimeout);
        
        this.categorySearchTimeout = setTimeout(() => {
            const categoryItems = document.querySelectorAll('.category-item');
            const searchTerm = query.toLowerCase();
            
            categoryItems.forEach(item => {
                const categoryName = item.querySelector('span').textContent.toLowerCase();
                const shouldShow = !searchTerm || categoryName.includes(searchTerm);
                item.style.display = shouldShow ? 'flex' : 'none';
            });
        }, 300);
    }

    handleScroll(e) {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        
        if (scrollTop + clientHeight >= scrollHeight - 100 && !this.isLoading) {
            const hasMoreItems = this.currentPage * this.itemsPerPage < this.filteredChannels.length;
            
            if (hasMoreItems) {
                this.isLoading = true;
                setTimeout(() => {
                    this.renderChannels();
                    this.isLoading = false;
                }, 100);
            }
        }
    }

    setViewMode(mode) {
        const channelList = document.getElementById('channelList');
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (mode === 'grid') {
            channelList.className = 'channel-list grid-view';
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            channelList.className = 'channel-list list-view';
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
        
        localStorage.setItem('iptv_view_mode', mode);
    }

    clearChannelList() {
        document.getElementById('channelList').innerHTML = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('categorySearchInput').value = '';
        
        // Reset category visibility
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.style.display = 'flex';
        });
    }

    showLoginScreen() {
        this.hideAllScreens();
        document.getElementById('loginScreen').classList.add('active');
    }

    showPlayerScreen() {
        this.hideAllScreens();
        document.getElementById('playerScreen').classList.add('active');
        
        // Restore view mode
        const savedViewMode = localStorage.getItem('iptv_view_mode') || 'grid';
        this.setViewMode(savedViewMode);
    }

    showLoadingScreen(message) {
        this.hideAllScreens();
        document.getElementById('loadingScreen').classList.add('active');
        this.updateLoadingStatus(message);
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    updateLoadingStatus(message) {
        const statusElement = document.getElementById('loadingStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('loginError');
        errorElement.style.display = 'none';
    }

    logout() {
        localStorage.removeItem('iptv_credentials');
        
        // Clear cached data on logout
        this.clearCachedData();
        
        // Clean up HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        // Close popout window if open
        if (this.popoutWindow && !this.popoutWindow.closed) {
            this.popoutWindow.close();
            this.popoutWindow = null;
        }
        
        this.apiCredentials = null;
        this.currentData = { live: [], movies: [], series: [], favorites: [] };
        this.currentCategory = null;
        this.currentChannels = [];
        this.filteredChannels = [];
        this.favoriteChannels = new Set();
        this.favoriteCategories = new Set();
        
        // Stop video
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.pause();
        videoPlayer.src = '';
        
        // Show overlay
        document.getElementById('playerOverlay').classList.remove('hidden');
        
        this.showLoginScreen();
    }

    toggleResizeMode() {
        this.isResizing = !this.isResizing;
        const resizeBtn = document.getElementById('resizeBtn');
        const playerContainer = document.getElementById('playerContainer');
        
        if (this.isResizing) {
            resizeBtn.classList.add('active');
            playerContainer.classList.add('resizing');
            resizeBtn.title = 'Exit resize mode';
        } else {
            resizeBtn.classList.remove('active');
            playerContainer.classList.remove('resizing');
            resizeBtn.title = 'Resize player';
        }
    }

    popoutPlayer() {
        const videoPlayer = document.getElementById('videoPlayer');
        const nowPlayingInfo = document.getElementById('nowPlayingInfo');
        
        if (this.popoutWindow && !this.popoutWindow.closed) {
            this.popoutWindow.focus();
            return;
        }
        
        const currentSrc = videoPlayer.src;
        const currentTime = videoPlayer.currentTime;
        const nowPlayingContent = nowPlayingInfo.innerHTML;
        
        if (!currentSrc) {
            alert('No video is currently playing');
            return;
        }
        
        const popoutHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>IPTV Player - Popout</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #000;
                        font-family: Arial, sans-serif;
                    }
                    video {
                        width: 100%;
                        height: calc(100vh - 60px);
                        object-fit: contain;
                    }
                    .info {
                        padding: 10px;
                        background: #1a1a1a;
                        color: white;
                        height: 40px;
                        display: flex;
                        align-items: center;
                    }
                    .info h4 {
                        margin: 0;
                        font-size: 14px;
                    }
                    .info p {
                        margin: 0;
                        font-size: 12px;
                        opacity: 0.7;
                        margin-left: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="info">
                    ${nowPlayingContent}
                </div>
                <video id="popoutVideo" controls autoplay></video>
                <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
                <script>
                    const video = document.getElementById('popoutVideo');
                    const src = '${currentSrc}';
                    const startTime = ${currentTime};
                    
                    if (src.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
                        const hls = new Hls();
                        hls.loadSource(src);
                        hls.attachMedia(video);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            video.currentTime = startTime;
                            video.play();
                        });
                    } else {
                        video.src = src;
                        video.currentTime = startTime;
                        video.play();
                    }
                    
                    window.addEventListener('beforeunload', () => {
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({
                                type: 'popoutClosed',
                                currentTime: video.currentTime
                            }, '*');
                        }
                    });
                </script>
            </body>
            </html>
        `;
        
        this.popoutWindow = window.open('', 'iptvPopout', 'width=800,height=600,resizable=yes');
        this.popoutWindow.document.write(popoutHtml);
        this.popoutWindow.document.close();
        
        // Pause main player
        videoPlayer.pause();
        
        // Listen for popout window messages
        window.addEventListener('message', (event) => {
            if (event.data.type === 'popoutClosed') {
                videoPlayer.currentTime = event.data.currentTime;
                this.popoutWindow = null;
            }
        });
    }

    toggleFullscreen() {
        const videoPlayer = document.getElementById('videoPlayer');
        
        if (!document.fullscreenElement) {
            if (videoPlayer.requestFullscreen) {
                videoPlayer.requestFullscreen();
            } else if (videoPlayer.webkitRequestFullscreen) {
                videoPlayer.webkitRequestFullscreen();
            } else if (videoPlayer.msRequestFullscreen) {
                videoPlayer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    initializeDragFunctionality() {
        const playerContainer = document.getElementById('playerContainer');
        const playerHeader = document.querySelector('.player-header');
        
        if (!playerContainer || !playerHeader) return;
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        playerHeader.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on control buttons
            if (e.target.closest('.control-btn')) return;
            
            isDragging = true;
            playerContainer.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = playerContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', stopDrag);
            
            e.preventDefault();
        });
        
        const handleDrag = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const containerRect = playerContainer.getBoundingClientRect();
            
            // Constrain to viewport
            const constrainedLeft = Math.max(0, Math.min(newLeft, viewportWidth - containerRect.width));
            const constrainedTop = Math.max(0, Math.min(newTop, viewportHeight - containerRect.height));
            
            // Apply position
            playerContainer.style.position = 'fixed';
            playerContainer.style.left = constrainedLeft + 'px';
            playerContainer.style.top = constrainedTop + 'px';
            playerContainer.style.zIndex = '1000';
        };
        
        const stopDrag = () => {
            isDragging = false;
            playerContainer.classList.remove('dragging');
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);
        };
    }

    initializeResizeHandle() {
        const resizeHandles = document.querySelectorAll('.resize-handle');
        const playerContainer = document.getElementById('playerContainer');
        
        if (!resizeHandles.length || !playerContainer) return;
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        let resizeDirection = '';
        
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (!this.isResizing) return;
                
                isResizing = true;
                resizeDirection = handle.dataset.direction;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = playerContainer.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left;
                startTop = rect.top;
                
                document.addEventListener('mousemove', handleResize);
                document.addEventListener('mouseup', stopResize);
                
                e.preventDefault();
            });
        });
        
        const handleResize = (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            // Handle different resize directions
            switch (resizeDirection) {
                case 'n':
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                    break;
                case 's':
                    newHeight = startHeight + deltaY;
                    break;
                case 'e':
                    newWidth = startWidth + deltaX;
                    break;
                case 'w':
                    newWidth = startWidth - deltaX;
                    newLeft = startLeft + deltaX;
                    break;
                case 'ne':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                    break;
                case 'nw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight - deltaY;
                    newLeft = startLeft + deltaX;
                    newTop = startTop + deltaY;
                    break;
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight + deltaY;
                    break;
                case 'sw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight + deltaY;
                    newLeft = startLeft + deltaX;
                    break;
            }
            
            // Apply minimum size constraints
            newWidth = Math.max(300, newWidth);
            newHeight = Math.max(169, newHeight);
            
            // Update player container size and position
            playerContainer.style.width = newWidth + 'px';
            playerContainer.style.height = newHeight + 'px';
            
            // For positioning when resizing from left or top
             if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
                 // Calculate new position relative to viewport
                 const viewportWidth = window.innerWidth;
                 const viewportHeight = window.innerHeight;
                 
                 // Ensure the container stays within viewport bounds
                 const constrainedLeft = Math.max(0, Math.min(newLeft, viewportWidth - newWidth));
                 const constrainedTop = Math.max(0, Math.min(newTop, viewportHeight - newHeight));
                 
                 playerContainer.style.position = 'fixed';
                 playerContainer.style.left = constrainedLeft + 'px';
                 playerContainer.style.top = constrainedTop + 'px';
                 playerContainer.style.zIndex = '1000';
             }
        };
        
        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        };
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('sidebar');
        const collapsedSidebar = document.getElementById('collapsedSidebar');
        const mainContent = document.querySelector('.main-content');
        const collapseBtn = document.getElementById('collapseBtn');
        const playerContainer = document.getElementById('playerContainer');
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            collapsedSidebar.classList.add('show');
            mainContent.classList.add('sidebar-collapsed');
            collapseBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            
            // Reset player position when collapsing sidebar
            if (playerContainer) {
                playerContainer.style.position = 'relative';
                playerContainer.style.left = 'auto';
                playerContainer.style.top = 'auto';
                playerContainer.style.zIndex = 'auto';
            }
        } else {
            sidebar.classList.remove('collapsed');
            collapsedSidebar.classList.remove('show');
            mainContent.classList.remove('sidebar-collapsed');
            collapseBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            this.hideChannelOverlay();
            
            // Reset player position when expanding sidebar
            if (playerContainer) {
                playerContainer.style.position = 'relative';
                playerContainer.style.left = 'auto';
                playerContainer.style.top = 'auto';
                playerContainer.style.zIndex = 'auto';
            }
        }
    }

    updateCollapsedTabState(activeType) {
        document.querySelectorAll('.collapsed-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.collapsed-tab[data-type="${activeType}"]`).classList.add('active');
    }

    initializeChannelHoverOverlay() {
        const liveTab = document.querySelector('.collapsed-tab[data-type="live"]');
        const channelOverlay = document.getElementById('channelHoverOverlay');
        
        if (!liveTab || !channelOverlay) return;
        
        liveTab.addEventListener('mouseenter', () => {
            if (this.sidebarCollapsed && this.currentType === 'live') {
                clearTimeout(this.overlayTimeout);
                this.showChannelOverlay();
            }
        });
        
        liveTab.addEventListener('mouseleave', () => {
            this.overlayTimeout = setTimeout(() => {
                this.hideChannelOverlay();
            }, 300);
        });
        
        channelOverlay.addEventListener('mouseenter', () => {
            clearTimeout(this.overlayTimeout);
        });
        
        channelOverlay.addEventListener('mouseleave', () => {
            this.hideChannelOverlay();
        });
    }

    showChannelOverlay() {
        const channelOverlay = document.getElementById('channelHoverOverlay');
        channelOverlay.classList.add('show');
        this.populateChannelOverlay();
    }

    hideChannelOverlay() {
        const channelOverlay = document.getElementById('channelHoverOverlay');
        channelOverlay.classList.remove('show');
    }

    populateChannelOverlay() {
        const overlayChannelList = document.getElementById('overlayChannelList');
        if (!overlayChannelList) return;
        
        overlayChannelList.innerHTML = '';
        
        // Get current channels (limited to first 50 for performance)
        const channels = this.currentChannels.slice(0, 50);
        
        channels.forEach(channel => {
            const overlayItem = document.createElement('div');
            overlayItem.className = 'overlay-channel-item';
            overlayItem.innerHTML = `
                <img src="${channel.stream_icon || '/placeholder-icon.png'}" 
                     alt="${channel.name}" 
                     class="overlay-channel-logo"
                     onerror="this.src='/placeholder-icon.png'">
                <div class="overlay-channel-info">
                    <p class="overlay-channel-name">${channel.name}</p>
                    <p class="overlay-channel-category">${this.currentCategory?.name || 'Live TV'}</p>
                </div>
            `;
            
            overlayItem.addEventListener('click', () => {
                this.playChannel(channel);
                this.hideChannelOverlay();
                
                // Update active state in main channel list
                document.querySelectorAll('.channel-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Find and activate the corresponding channel in main list
                const mainChannelItem = document.querySelector(`[data-channel-id="${channel.stream_id}"]`);
                if (mainChannelItem) {
                    mainChannelItem.classList.add('active');
                }
            });
            
            overlayChannelList.appendChild(overlayItem);
        });
    }

    async fetchWithTimeout(url, timeout = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - server not responding');
            }
            throw error;
        }
    }

    // Theatre Mode Methods
    toggleTheatreMode() {
        if (this.isTheatreMode) {
            this.exitTheatreMode();
        } else {
            this.enterTheatreMode();
        }
    }

    enterTheatreMode() {
        this.isTheatreMode = true;
        const playerScreen = document.getElementById('playerScreen');
        const theatreQuickChannels = document.getElementById('theatreQuickChannels');
        const theatreModeBtn = document.getElementById('theatreModeBtn');
        
        // Add theatre mode class
        playerScreen.classList.add('theatre-mode');
        
        // Show theatre quick channels panel
        theatreQuickChannels.style.display = 'flex';
        
        // Update button styling and text
        theatreModeBtn.classList.add('active');
        theatreModeBtn.innerHTML = '<i class="fas fa-compress"></i>Exit Theatre';
        theatreModeBtn.title = 'Exit Theatre Mode';
        
        // Populate theatre channel list
        this.populateTheatreChannels();
        
        // Hide cursor after inactivity
        this.setupCursorHiding();
    }

    exitTheatreMode() {
        this.isTheatreMode = false;
        const playerScreen = document.getElementById('playerScreen');
        const theatreQuickChannels = document.getElementById('theatreQuickChannels');
        const theatreModeBtn = document.getElementById('theatreModeBtn');
        
        // Remove theatre mode class
        playerScreen.classList.remove('theatre-mode');
        
        // Hide theatre quick channels panel
        theatreQuickChannels.style.display = 'none';
        theatreQuickChannels.classList.remove('visible');
        
        // Update button styling and text
        theatreModeBtn.classList.remove('active');
        theatreModeBtn.innerHTML = '<i class="fas fa-theater-masks"></i>Theatre';
        theatreModeBtn.title = 'Theatre Mode';
        
        // Clear hover timeout
        if (this.theatreHoverTimeout) {
            clearTimeout(this.theatreHoverTimeout);
        }
        
        // Show cursor
        document.body.style.cursor = 'default';
    }

    initializeTheatreHover() {
        const theatreHoverTrigger = document.getElementById('theatreHoverTrigger');
        const theatreQuickChannels = document.getElementById('theatreQuickChannels');
        
        // Show panel on hover trigger
        theatreHoverTrigger.addEventListener('mouseenter', () => {
            if (this.isTheatreMode) {
                theatreQuickChannels.classList.add('visible');
                if (this.theatreHoverTimeout) {
                    clearTimeout(this.theatreHoverTimeout);
                }
            }
        });
        
        // Hide panel when leaving both trigger and panel
        const hidePanel = () => {
            if (this.isTheatreMode) {
                this.theatreHoverTimeout = setTimeout(() => {
                    theatreQuickChannels.classList.remove('visible');
                }, 300);
            }
        };
        
        theatreHoverTrigger.addEventListener('mouseleave', hidePanel);
        
        // Keep panel visible when hovering over it
        theatreQuickChannels.addEventListener('mouseenter', () => {
            if (this.theatreHoverTimeout) {
                clearTimeout(this.theatreHoverTimeout);
            }
        });
        
        theatreQuickChannels.addEventListener('mouseleave', hidePanel);
    }

    populateTheatreChannels() {
        const theatreChannelList = document.getElementById('theatreChannelList');
        theatreChannelList.innerHTML = '';
        
        // Get current channels (limit to first 20 for quick access)
        const channels = this.filteredChannels.slice(0, 20);
        
        channels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'theatre-channel-item';
            channelItem.dataset.channelId = channel.stream_id || channel.series_id || channel.id;
            
            // Check if this is the currently playing channel
            const videoPlayer = document.getElementById('videoPlayer');
            const currentSrc = videoPlayer.src;
            const channelUrl = this.getChannelUrl(channel);
            if (currentSrc && channelUrl && currentSrc.includes(channelUrl.split('/').pop())) {
                channelItem.classList.add('active');
            }
            
            channelItem.innerHTML = `
                <img class="theatre-channel-logo" src="${channel.stream_icon || ''}" 
                     alt="${channel.name}" onerror="this.style.display='none'">
                <div class="theatre-channel-info">
                    <div class="theatre-channel-name">${channel.name}</div>
                    <div class="theatre-channel-category">${channel.category_name || 'Uncategorized'}</div>
                </div>
            `;
            
            channelItem.addEventListener('click', () => {
                this.playChannel(channel, channelItem);
                
                // Update active state
                document.querySelectorAll('.theatre-channel-item').forEach(item => {
                    item.classList.remove('active');
                });
                channelItem.classList.add('active');
                
                // Hide panel after selection
                setTimeout(() => {
                    document.getElementById('theatreQuickChannels').classList.remove('visible');
                }, 500);
            });
            
            theatreChannelList.appendChild(channelItem);
        });
    }

    getChannelUrl(channel) {
        if (!this.apiCredentials) return '';
        
        const { server, username, password } = this.apiCredentials;
        const baseUrl = `${server}/live/${username}/${password}`;
        
        if (channel.stream_id) {
            return `${baseUrl}/${channel.stream_id}.m3u8`;
        } else if (channel.container_extension) {
            return `${server}/movie/${username}/${password}/${channel.stream_id}.${channel.container_extension}`;
        }
        
        return '';
    }

    setupCursorHiding() {
        let cursorTimeout;
        const playerContainer = document.getElementById('playerContainer');
        
        const hideCursor = () => {
            if (this.isTheatreMode) {
                document.body.style.cursor = 'none';
            }
        };
        
        const showCursor = () => {
            document.body.style.cursor = 'default';
            if (cursorTimeout) {
                clearTimeout(cursorTimeout);
            }
            if (this.isTheatreMode) {
                cursorTimeout = setTimeout(hideCursor, 3000);
            }
        };
        
        // Show cursor on mouse movement
        document.addEventListener('mousemove', showCursor);
        
        // Initial cursor hiding
        if (this.isTheatreMode) {
            cursorTimeout = setTimeout(hideCursor, 3000);
        }
    }

    // Favorites Popup Methods
    initializeFavoritesPopup() {
        const favoritesTab = document.querySelector('.collapsed-tab[data-type="favorites"]');
        const favoritesPopup = document.getElementById('favoritesPopup');
        
        if (!favoritesTab || !favoritesPopup) return;
        
        // Show popup on hover
        favoritesTab.addEventListener('mouseenter', () => {
            if (this.sidebarCollapsed) {
                this.showFavoritesPopup();
                if (this.favoritesHoverTimeout) {
                    clearTimeout(this.favoritesHoverTimeout);
                }
            }
        });
        
        // Hide popup when leaving both tab and popup
        const hidePopup = () => {
            this.favoritesHoverTimeout = setTimeout(() => {
                this.hideFavoritesPopup();
            }, 300);
        };
        
        favoritesTab.addEventListener('mouseleave', hidePopup);
        
        // Keep popup visible when hovering over it
        favoritesPopup.addEventListener('mouseenter', () => {
            if (this.favoritesHoverTimeout) {
                clearTimeout(this.favoritesHoverTimeout);
            }
        });
        
        favoritesPopup.addEventListener('mouseleave', hidePopup);
    }

    showFavoritesPopup() {
        const favoritesPopup = document.getElementById('favoritesPopup');
        favoritesPopup.style.display = 'flex';
        favoritesPopup.classList.add('visible');
        this.populateFavoritesPopup();
    }

    hideFavoritesPopup() {
        const favoritesPopup = document.getElementById('favoritesPopup');
        favoritesPopup.classList.remove('visible');
        setTimeout(() => {
            if (!favoritesPopup.classList.contains('visible')) {
                favoritesPopup.style.display = 'none';
            }
        }, 300);
    }

    populateFavoritesPopup() {
        const favoritesPopupList = document.getElementById('favoritesPopupList');
        favoritesPopupList.innerHTML = '';
        
        // Get all favorite channels from all types
        const favoriteChannels = [];
        
        // Collect favorites from live channels
        if (this.currentData.live) {
            Object.values(this.currentData.live).forEach(category => {
                if (category.channels) {
                    category.channels.forEach(channel => {
                        const channelId = `live_${channel.stream_id}`;
                        if (this.favoriteChannels.has(channelId)) {
                            favoriteChannels.push({
                                ...channel,
                                originalType: 'live',
                                category_name: category.category_name
                            });
                        }
                    });
                }
            });
        }
        
        // Collect favorites from movies
        if (this.currentData.movies) {
            Object.values(this.currentData.movies).forEach(category => {
                if (category.channels) {
                    category.channels.forEach(channel => {
                        const channelId = `movies_${channel.stream_id}`;
                        if (this.favoriteChannels.has(channelId)) {
                            favoriteChannels.push({
                                ...channel,
                                originalType: 'movies',
                                category_name: category.category_name
                            });
                        }
                    });
                }
            });
        }
        
        // Collect favorites from series
        if (this.currentData.series) {
            Object.values(this.currentData.series).forEach(category => {
                if (category.channels) {
                    category.channels.forEach(channel => {
                        const channelId = `series_${channel.series_id}`;
                        if (this.favoriteChannels.has(channelId)) {
                            favoriteChannels.push({
                                ...channel,
                                originalType: 'series',
                                category_name: category.category_name
                            });
                        }
                    });
                }
            });
        }
        
        if (favoriteChannels.length === 0) {
            favoritesPopupList.innerHTML = `
                <div class="favorites-popup-empty">
                    <i class="fas fa-heart-broken"></i>
                    <p>No favorite channels yet</p>
                </div>
            `;
            return;
        }
        
        // Sort favorites by name
        favoriteChannels.sort((a, b) => a.name.localeCompare(b.name));
        
        favoriteChannels.forEach(channel => {
            const popupItem = document.createElement('div');
            popupItem.className = 'favorites-popup-item';
            popupItem.dataset.channelId = channel.stream_id || channel.series_id || channel.id;
            
            // Check if this is the currently playing channel
            const videoPlayer = document.getElementById('videoPlayer');
            const currentSrc = videoPlayer.src;
            const channelUrl = this.getChannelUrl(channel);
            if (currentSrc && channelUrl && currentSrc.includes(channelUrl.split('/').pop())) {
                popupItem.classList.add('active');
            }
            
            popupItem.innerHTML = `
                <img class="favorites-popup-logo" src="${channel.stream_icon || ''}" 
                     alt="${channel.name}" onerror="this.style.display='none'">
                <div class="favorites-popup-info">
                    <div class="favorites-popup-name">${channel.name}</div>
                    <div class="favorites-popup-category">${channel.category_name || 'Uncategorized'} • ${channel.originalType}</div>
                </div>
            `;
            
            popupItem.addEventListener('click', () => {
                // Switch to the appropriate tab first
                this.switchTab(channel.originalType);
                
                // Wait a bit for the tab to load, then play the channel
                setTimeout(() => {
                    this.playChannel(channel, popupItem);
                    
                    // Update active state
                    document.querySelectorAll('.favorites-popup-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    popupItem.classList.add('active');
                    
                    // Hide popup after selection
                    this.hideFavoritesPopup();
                }, 100);
            });
            
            favoritesPopupList.appendChild(popupItem);
        });
    }

    // Subtitle functionality
    initializeSubtitles() {
        // Initialize subtitle functionality
        console.log('Subtitle functionality initialized');
        
        // Initialize timing controls
        this.initializeTimingControls();
    }
    
    initializeTimingControls() {
        const applyTimingBtn = document.getElementById('applyTimingBtn');
        const resetTimingBtn = document.getElementById('resetTimingBtn');
        
        if (applyTimingBtn) {
            applyTimingBtn.addEventListener('click', () => this.applySubtitleTiming());
        }
        
        if (resetTimingBtn) {
            resetTimingBtn.addEventListener('click', () => this.resetSubtitleTiming());
        }
    }
    
    applySubtitleTiming() {
        const secondsInput = document.getElementById('subtitleOffsetSeconds');
        const millisecondsInput = document.getElementById('subtitleOffsetMilliseconds');
        
        if (!secondsInput || !millisecondsInput) return;
        
        const seconds = parseInt(secondsInput.value) || 0;
        const milliseconds = parseInt(millisecondsInput.value) || 0;
        
        // Convert to total milliseconds
        this.subtitleOffset = (seconds * 1000) + milliseconds;
        
        // Reapply current subtitle with new timing
        if (this.currentSubtitle) {
            this.setSubtitle(this.currentSubtitle);
            this.showError(`Subtitle timing adjusted by ${seconds}s ${milliseconds}ms`, 'success');
        } else {
            this.showError('No subtitle loaded to adjust timing');
        }
    }
    
    resetSubtitleTiming() {
        const secondsInput = document.getElementById('subtitleOffsetSeconds');
        const millisecondsInput = document.getElementById('subtitleOffsetMilliseconds');
        
        if (secondsInput) secondsInput.value = '0';
        if (millisecondsInput) millisecondsInput.value = '0';
        
        this.subtitleOffset = 0;
        
        // Reapply current subtitle with reset timing
        if (this.currentSubtitle) {
            this.setSubtitle(this.currentSubtitle);
            this.showError('Subtitle timing reset to original', 'success');
        }
    }

    openSubtitleModal() {
        const modal = document.getElementById('subtitleModal');
        modal.classList.add('active');
        this.updateSubtitleList();
        
        // Reset provider subtitle status
        const statusElement = document.getElementById('providerSubtitleStatus');
        if (statusElement) {
            statusElement.classList.remove('hidden');
            if (this.currentChannel) {
                this.updateProviderSubtitleStatus('info', 'Provider subtitles checked when channel was loaded');
            } else {
                this.updateProviderSubtitleStatus('info', 'No channel selected');
            }
        }
        
        // Auto-populate search if we have current channel info
        if (this.currentChannel) {
            const searchInput = document.getElementById('subtitleSearchInput');
            searchInput.value = this.currentChannel.name;
        }
    }

    closeSubtitleModal() {
        const modal = document.getElementById('subtitleModal');
        modal.classList.remove('active');
    }

    updateSubtitleList() {
        const subtitleList = document.getElementById('subtitleList');
        subtitleList.innerHTML = '';
        
        if (this.subtitles.length === 0) {
            subtitleList.innerHTML = `
                <div class="subtitle-item disabled">
                    <span>No subtitles available</span>
                </div>
            `;
            return;
        }
        
        // Add "None" option
        const noneItem = document.createElement('div');
        noneItem.className = `subtitle-item ${!this.currentSubtitle ? 'active' : ''}`;
        noneItem.innerHTML = `
            <div class="subtitle-info">
                <span class="subtitle-name">None</span>
                <span class="subtitle-details">Disable subtitles</span>
            </div>
        `;
        noneItem.addEventListener('click', () => {
            this.setSubtitle(null);
            this.updateSubtitleList();
        });
        subtitleList.appendChild(noneItem);
        
        // Add available subtitles
        this.subtitles.forEach((subtitle, index) => {
            const item = document.createElement('div');
            item.className = `subtitle-item ${this.currentSubtitle === subtitle ? 'active' : ''}`;
            
            item.innerHTML = `
                <div class="subtitle-info">
                    <span class="subtitle-name">${subtitle.name}</span>
                    <span class="subtitle-details">${subtitle.language} • ${subtitle.source}</span>
                </div>
                <div class="subtitle-actions">
                    <button class="subtitle-action-btn" onclick="event.stopPropagation()">
                        ${this.currentSubtitle === subtitle ? 'Active' : 'Use'}
                    </button>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.setSubtitle(subtitle);
                this.updateSubtitleList();
            });
            
            subtitleList.appendChild(item);
        });
    }

    async handleSubtitleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const selectedFileName = document.getElementById('selectedFileName');
        selectedFileName.textContent = file.name;
        
        try {
            const text = await this.readFileAsText(file);
            const subtitle = {
                name: file.name,
                language: 'Unknown',
                source: 'Local File',
                content: text,
                url: null,
                type: this.getSubtitleType(file.name)
            };
            
            this.addSubtitle(subtitle);
            this.updateSubtitleList();
            this.showError(`Subtitle "${file.name}" imported successfully!`, 'success');
        } catch (error) {
            console.error('Error importing subtitle:', error);
            this.showError('Failed to import subtitle file');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    getSubtitleType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'srt': return 'srt';
            case 'vtt': return 'vtt';
            case 'ass':
            case 'ssa': return 'ass';
            default: return 'srt';
        }
    }

    async searchOpenSubtitles() {
        const searchInput = document.getElementById('subtitleSearchInput');
        const languageSelect = document.getElementById('subtitleLanguageSelect');
        const searchResults = document.getElementById('searchResults');
        
        const query = searchInput.value.trim();
        const language = languageSelect.value;
        
        if (!query) {
            this.showError('Please enter a search term');
            return;
        }
        
        searchResults.innerHTML = `
            <div class="loading-subtitles">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Searching Addic7ed...</p>
            </div>
        `;
        
        try {
            const results = await this.realOpenSubtitlesSearch(query, language);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Error searching subtitles:', error);
            searchResults.innerHTML = `
                <div class="subtitle-item disabled">
                    <span>Search failed: ${error.message}</span>
                </div>
            `;
        }
    }

    async realOpenSubtitlesSearch(query, language) {
        // Use Addic7ed API - completely free, no API key required
        try {
            const results = await this.searchAddic7ed(query, language);
            return results;
        } catch (error) {
            console.error('Error searching Addic7ed:', error);
            throw new Error('Failed to search Addic7ed');
        }
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="subtitle-item disabled">
                    <span>No subtitles found</span>
                </div>
            `;
            return;
        }
        
        searchResults.innerHTML = '';
        
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'subtitle-item';
            
            item.innerHTML = `
                <div class="subtitle-info">
                    <span class="subtitle-name">${result.name}</span>
                    <span class="subtitle-details">${result.language} • Rating: ${result.rating} • Downloads: ${result.downloads}</span>
                </div>
                <div class="subtitle-actions">
                    <button class="subtitle-action-btn download-btn">
                        Download
                    </button>
                </div>
            `;
            
            const downloadBtn = item.querySelector('.download-btn');
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadSubtitle(result);
            });
            
            searchResults.appendChild(item);
        });
    }

    async downloadSubtitle(subtitleInfo) {
        try {
            // Use CORS proxy to download from Addic7ed
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const downloadUrl = `${corsProxy}${encodeURIComponent(subtitleInfo.downloadUrl)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(downloadUrl, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const subtitleContent = await response.text();
            
            // Validate that we got actual subtitle content
            if (!subtitleContent || subtitleContent.length < 10) {
                throw new Error('Invalid subtitle content received');
            }
            
            // Check if it's actually subtitle content (should contain timestamps)
            if (!subtitleContent.includes('-->') && !subtitleContent.includes('Dialogue:')) {
                throw new Error('Downloaded content does not appear to be a subtitle file');
            }
            
            const subtitle = {
                name: subtitleInfo.name,
                language: subtitleInfo.language,
                source: subtitleInfo.source,
                content: subtitleContent,
                url: null,
                type: subtitleInfo.format || 'srt'
            };
            
            this.addSubtitle(subtitle);
            this.updateSubtitleList();
            this.showError(`Subtitle "${subtitleInfo.name}" downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Error downloading subtitle:', error);
            this.showError(`Failed to download subtitle: ${error.message}`);
        }
    }



    addSubtitle(subtitle) {
        // Remove existing subtitle with same name
        this.subtitles = this.subtitles.filter(s => s.name !== subtitle.name);
        this.subtitles.push(subtitle);
    }

    setSubtitle(subtitle) {
        const videoPlayer = document.getElementById('videoPlayer');
        
        // Remove existing subtitle tracks (only external ones)
        const existingTracks = videoPlayer.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());
        
        this.currentSubtitle = subtitle;
        
        if (!subtitle) {
            // Disable all embedded tracks
            for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                videoPlayer.textTracks[i].mode = 'disabled';
            }
            return; // No subtitle selected
        }
        
        // Handle embedded subtitles
        if (subtitle.isEmbedded && subtitle.track) {
            console.log('Enabling embedded subtitle track:', subtitle.name);
            
            // Disable all tracks first
            for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                videoPlayer.textTracks[i].mode = 'disabled';
            }
            
            // Enable the selected embedded track
            subtitle.track.mode = 'showing';
            console.log('Embedded subtitle track enabled:', subtitle.name);
            return;
        }
        
        // Handle external subtitles
        try {
            let subtitleContent = subtitle.content;
            
            // Convert to VTT if needed and apply timing offset
            if (subtitle.type === 'srt') {
                subtitleContent = this.convertSrtToVtt(subtitleContent);
            } else if (subtitle.type === 'vtt' && this.subtitleOffset !== 0) {
                // Apply timing offset to VTT content
                subtitleContent = this.applyVttTimingOffset(subtitleContent, this.subtitleOffset);
            }
            
            // Create blob URL for the subtitle
            const blob = new Blob([subtitleContent], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);
            
            // Create and add track element
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.src = url;
            track.srclang = subtitle.language || 'en';
            track.label = subtitle.name;
            track.default = true;
            
            videoPlayer.appendChild(track);
            
            // Disable all embedded tracks when using external subtitles
            for (let i = 0; i < videoPlayer.textTracks.length - 1; i++) {
                videoPlayer.textTracks[i].mode = 'disabled';
            }
            
            // Enable the track
            track.addEventListener('load', () => {
                if (videoPlayer.textTracks.length > 0) {
                    videoPlayer.textTracks[videoPlayer.textTracks.length - 1].mode = 'showing';
                }
            });
            
            console.log('External subtitle loaded:', subtitle.name);
        } catch (error) {
            console.error('Error setting subtitle:', error);
            this.showError('Failed to load subtitle');
        }
    }

    convertSrtToVtt(srtContent) {
        // Convert SRT format to WebVTT format with timing offset
        let vttContent = 'WEBVTT\n\n';
        
        // Apply timing offset if set
        if (this.subtitleOffset !== 0) {
            srtContent = this.applyTimingOffset(srtContent, this.subtitleOffset);
        }
        
        // Replace SRT timestamp format with VTT format
        vttContent += srtContent.replace(/,/g, '.');
        
        return vttContent;
    }
    
    applyTimingOffset(srtContent, offsetMs) {
        // Apply timing offset to SRT content
        const timeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/g;
        
        return srtContent.replace(timeRegex, (match, h1, m1, s1, ms1, h2, m2, s2, ms2) => {
            // Convert start time to milliseconds
            const startMs = this.timeToMilliseconds(parseInt(h1), parseInt(m1), parseInt(s1), parseInt(ms1));
            // Convert end time to milliseconds
            const endMs = this.timeToMilliseconds(parseInt(h2), parseInt(m2), parseInt(s2), parseInt(ms2));
            
            // Apply offset
            const newStartMs = Math.max(0, startMs + offsetMs);
            const newEndMs = Math.max(0, endMs + offsetMs);
            
            // Convert back to time format
            const newStart = this.millisecondsToTime(newStartMs);
            const newEnd = this.millisecondsToTime(newEndMs);
            
            return `${newStart} --> ${newEnd}`;
        });
    }
    
    timeToMilliseconds(hours, minutes, seconds, milliseconds) {
        return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
    }
    
    millisecondsToTime(totalMs) {
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }
    
    applyVttTimingOffset(vttContent, offsetMs) {
        // Apply timing offset to VTT content (format: HH:MM:SS.mmm)
        const timeRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/g;
        
        return vttContent.replace(timeRegex, (match, h1, m1, s1, ms1, h2, m2, s2, ms2) => {
            // Convert start time to milliseconds
            const startMs = this.timeToMilliseconds(parseInt(h1), parseInt(m1), parseInt(s1), parseInt(ms1));
            // Convert end time to milliseconds
            const endMs = this.timeToMilliseconds(parseInt(h2), parseInt(m2), parseInt(s2), parseInt(ms2));
            
            // Apply offset
            const newStartMs = Math.max(0, startMs + offsetMs);
            const newEndMs = Math.max(0, endMs + offsetMs);
            
            // Convert back to VTT time format
            const newStart = this.millisecondsToVttTime(newStartMs);
            const newEnd = this.millisecondsToVttTime(newEndMs);
            
            return `${newStart} --> ${newEnd}`;
        });
    }
    
    millisecondsToVttTime(totalMs) {
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    clearSubtitles() {
        const videoPlayer = document.getElementById('videoPlayer');
        
        // Remove existing subtitle tracks
        const existingTracks = videoPlayer.querySelectorAll('track');
        existingTracks.forEach(track => {
            URL.revokeObjectURL(track.src);
            track.remove();
        });
        
        this.currentSubtitle = null;
    }
    
    async checkProviderSubtitles(channel) {
        try {
            console.log('=== SUBTITLE DETECTION DEBUG ===');
            console.log('Checking for provider subtitles...', channel);
            console.log('Channel type:', channel.originalType || this.currentType);
            console.log('Channel name:', channel.name);
            console.log('Channel keys:', Object.keys(channel));
            this.updateProviderSubtitleStatus('checking', 'Checking for provider subtitles...');
            
            // Check if channel data contains subtitle information
            const subtitleFields = [
                'subtitles', 'subtitle_url', 'subtitle_urls', 'subs',
                'captions', 'caption_url', 'cc', 'vtt_url', 'srt_url',
                'subtitle_tracks', 'tracks', 'multi_sub'
            ];
            
            let foundSubtitles = [];
            let totalFound = 0;
            
            // Check for subtitle fields in channel data
            const dataToCheck = [channel];
            
            // For series, also check episode data
            if (channel.currentEpisode) {
                dataToCheck.push(channel.currentEpisode);
                console.log('Checking episode data for subtitles:', channel.currentEpisode);
            }
            
            // If we have episodes data, check series info as well
            if (channel.episodesData && channel.episodesData.info) {
                dataToCheck.push(channel.episodesData.info);
                console.log('Checking series info for subtitles:', channel.episodesData.info);
                console.log('Series info keys:', Object.keys(channel.episodesData.info));
                console.log('Full series info:', JSON.stringify(channel.episodesData.info, null, 2));
            }
            
            for (const dataSource of dataToCheck) {
                for (const field of subtitleFields) {
                    if (dataSource[field]) {
                        console.log(`Found subtitle field '${field}' in ${dataSource === channel ? 'channel' : dataSource === channel.currentEpisode ? 'episode' : 'series info'}:`, dataSource[field]);
                        
                        if (typeof dataSource[field] === 'string') {
                            // Single subtitle URL
                            foundSubtitles.push({
                                name: `Provider Subtitle (${field})`,
                                url: dataSource[field],
                                language: 'Unknown',
                                source: 'IPTV Provider'
                            });
                        } else if (Array.isArray(dataSource[field])) {
                            // Multiple subtitle URLs
                            dataSource[field].forEach((sub, index) => {
                                if (typeof sub === 'string') {
                                    foundSubtitles.push({
                                        name: `Provider Subtitle ${index + 1}`,
                                        url: sub,
                                        language: 'Unknown',
                                        source: 'IPTV Provider'
                                    });
                                } else if (typeof sub === 'object' && sub.url) {
                                    foundSubtitles.push({
                                        name: sub.name || `Provider Subtitle ${index + 1}`,
                                        url: sub.url,
                                        language: sub.language || sub.lang || 'Unknown',
                                        source: 'IPTV Provider'
                                    });
                                }
                            });
                        } else if (typeof dataSource[field] === 'object') {
                            // Object with subtitle data
                            Object.entries(dataSource[field]).forEach(([key, value]) => {
                                if (typeof value === 'string') {
                                    foundSubtitles.push({
                                        name: `Provider Subtitle (${key})`,
                                        url: value,
                                        language: key.toUpperCase(),
                                        source: 'IPTV Provider'
                                    });
                                }
                            });
                        }
                    }
                }
            }
            
            // Check for M3U8 playlist subtitles (for live streams)
            if (channel.originalType === 'live' || this.currentType === 'live') {
                const m3u8Subtitles = await this.checkM3U8Subtitles(channel);
                totalFound += m3u8Subtitles;
            }
            
            // Check for series stream subtitles
            if ((channel.originalType === 'series' || this.currentType === 'series') && channel.currentEpisode) {
                const seriesSubtitles = await this.checkSeriesStreamSubtitles(channel);
                totalFound += seriesSubtitles;
            }
            
            // Download found subtitles
            if (foundSubtitles.length > 0) {
                console.log(`Found ${foundSubtitles.length} provider subtitle(s)`);
                for (const sub of foundSubtitles) {
                    const success = await this.downloadProviderSubtitle(sub);
                    if (success) totalFound++;
                }
            }
            
            // Update status based on results
            if (totalFound > 0) {
                this.updateProviderSubtitleStatus('success', `Found ${totalFound} provider subtitle${totalFound > 1 ? 's' : ''}`);
            } else {
                console.log('=== NO SUBTITLES FOUND DEBUG ===');
                console.log('Checked data sources:', dataToCheck.length);
                console.log('Checked subtitle fields:', subtitleFields);
                console.log('Series episode data available:', !!channel.currentEpisode);
                console.log('Series info data available:', !!(channel.episodesData && channel.episodesData.info));
                console.log('Found subtitles array length:', foundSubtitles.length);
                this.updateProviderSubtitleStatus('info', 'No provider subtitles available');
            }
            
        } catch (error) {
            console.error('Error checking provider subtitles:', error);
            this.updateProviderSubtitleStatus('error', 'Error checking provider subtitles');
        }
    }
    
    updateProviderSubtitleStatus(type, message) {
        const statusElement = document.getElementById('providerSubtitleStatus');
        if (!statusElement) return;
        
        const iconElement = statusElement.querySelector('i');
        const textElement = statusElement.querySelector('span');
        
        // Reset classes
        statusElement.className = 'provider-subtitle-status';
        
        // Set icon and class based on type
        switch (type) {
            case 'checking':
                iconElement.className = 'fas fa-spinner fa-spin';
                statusElement.classList.add('info');
                break;
            case 'success':
                iconElement.className = 'fas fa-check-circle';
                statusElement.classList.add('success');
                break;
            case 'error':
                iconElement.className = 'fas fa-exclamation-triangle';
                statusElement.classList.add('error');
                break;
            case 'info':
            default:
                iconElement.className = 'fas fa-info-circle';
                break;
        }
        
        textElement.textContent = message;
        
        // Hide after 5 seconds for success/error messages
        if (type === 'success' || type === 'error' || type === 'info') {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, 5000);
        }
    }
    
    async checkM3U8Subtitles(channel) {
        let foundCount = 0;
        try {
            // Get the M3U8 playlist URL
            const playlistUrl = `${this.apiCredentials.server}/live/${this.apiCredentials.username}/${this.apiCredentials.password}/${channel.stream_id}.m3u8`;
            
            console.log('Checking M3U8 playlist for subtitles:', playlistUrl);
            
            const response = await fetch(playlistUrl);
            if (!response.ok) {
                console.log('Could not fetch M3U8 playlist for subtitle check');
                return foundCount;
            }
            
            const playlistContent = await response.text();
            
            // Look for subtitle tracks in M3U8 playlist
            const subtitleRegex = /#EXT-X-MEDIA:TYPE=SUBTITLES[^\n]*URI="([^"]+)"[^\n]*LANGUAGE="([^"]+)"[^\n]*NAME="([^"]+)"/g;
            let match;
            
            while ((match = subtitleRegex.exec(playlistContent)) !== null) {
                const [, uri, language, name] = match;
                
                // Resolve relative URLs
                let subtitleUrl = uri;
                if (!uri.startsWith('http')) {
                    const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/'));
                    subtitleUrl = `${baseUrl}/${uri}`;
                }
                
                console.log(`Found M3U8 subtitle track: ${name} (${language})`);
                
                const success = await this.downloadProviderSubtitle({
                    name: `${name} (${language})`,
                    url: subtitleUrl,
                    language: language,
                    source: 'M3U8 Playlist'
                });
                
                if (success) foundCount++;
            }
            
        } catch (error) {
            console.error('Error checking M3U8 subtitles:', error);
        }
        
        return foundCount;
    }
    
    async checkSeriesStreamSubtitles(channel) {
        let foundCount = 0;
        try {
            if (!channel.currentEpisode) {
                return foundCount;
            }
            
            const episode = channel.currentEpisode;
            console.log('Checking series stream for subtitles:', episode);
            console.log('Episode keys:', Object.keys(episode));
            console.log('Full episode data:', JSON.stringify(episode, null, 2));
            
            // Check if episode has subtitle-related fields
            const subtitleFields = [
                'subtitles', 'subtitle_url', 'subtitle_urls', 'subs',
                'captions', 'caption_url', 'cc', 'vtt_url', 'srt_url',
                'subtitle_tracks', 'tracks', 'multi_sub'
            ];
            
            for (const field of subtitleFields) {
                if (episode[field]) {
                    console.log(`Found episode subtitle field '${field}':`, episode[field]);
                    
                    if (typeof episode[field] === 'string') {
                        // Single subtitle URL
                        const success = await this.downloadProviderSubtitle({
                            name: `Episode Subtitle (${field})`,
                            url: episode[field],
                            language: 'Unknown',
                            source: 'Series Episode'
                        });
                        if (success) foundCount++;
                    } else if (Array.isArray(episode[field])) {
                        // Multiple subtitle URLs
                        for (let i = 0; i < episode[field].length; i++) {
                            const sub = episode[field][i];
                            if (typeof sub === 'string') {
                                const success = await this.downloadProviderSubtitle({
                                    name: `Episode Subtitle ${i + 1}`,
                                    url: sub,
                                    language: 'Unknown',
                                    source: 'Series Episode'
                                });
                                if (success) foundCount++;
                            } else if (typeof sub === 'object' && sub.url) {
                                const success = await this.downloadProviderSubtitle({
                                    name: sub.name || `Episode Subtitle ${i + 1}`,
                                    url: sub.url,
                                    language: sub.language || sub.lang || 'Unknown',
                                    source: 'Series Episode'
                                });
                                if (success) foundCount++;
                            }
                        }
                    } else if (typeof episode[field] === 'object') {
                        // Object with subtitle data
                        for (const [key, value] of Object.entries(episode[field])) {
                            if (typeof value === 'string') {
                                const success = await this.downloadProviderSubtitle({
                                    name: `Episode Subtitle (${key})`,
                                    url: value,
                                    language: key.toUpperCase(),
                                    source: 'Series Episode'
                                });
                                if (success) foundCount++;
                            }
                        }
                    }
                }
            }
            
            // Try to fetch subtitle tracks from the stream URL itself
            const streamUrl = `${this.apiCredentials.server}/series/${this.apiCredentials.username}/${this.apiCredentials.password}/${episode.id}.${episode.container_extension || 'mp4'}`;
            
            // Check for companion subtitle files (common naming patterns)
            const subtitleExtensions = ['srt', 'vtt', 'ass'];
            const languages = ['en', 'eng', 'english', 'es', 'spa', 'spanish', 'fr', 'fre', 'french'];
            
            for (const ext of subtitleExtensions) {
                // Try base filename with subtitle extension
                const baseSubUrl = streamUrl.replace(/\.[^.]+$/, `.${ext}`);
                try {
                    const response = await fetch(baseSubUrl, { method: 'HEAD' });
                    if (response.ok) {
                        console.log(`Found companion subtitle file: ${baseSubUrl}`);
                        const success = await this.downloadProviderSubtitle({
                            name: `Episode Subtitle (${ext.toUpperCase()})`,
                            url: baseSubUrl,
                            language: 'Unknown',
                            source: 'Companion File'
                        });
                        if (success) foundCount++;
                    }
                } catch (error) {
                    // Ignore errors for companion file checks
                }
                
                // Try with language codes
                for (const lang of languages) {
                    const langSubUrl = streamUrl.replace(/\.[^.]+$/, `.${lang}.${ext}`);
                    try {
                        const response = await fetch(langSubUrl, { method: 'HEAD' });
                        if (response.ok) {
                            console.log(`Found language-specific subtitle file: ${langSubUrl}`);
                            const success = await this.downloadProviderSubtitle({
                                name: `Episode Subtitle (${lang.toUpperCase()} ${ext.toUpperCase()})`,
                                url: langSubUrl,
                                language: lang.toUpperCase(),
                                source: 'Companion File'
                            });
                            if (success) foundCount++;
                        }
                    } catch (error) {
                        // Ignore errors for companion file checks
                    }
                }
            }
            
        } catch (error) {
            console.error('Error checking series stream subtitles:', error);
        }
        
        return foundCount;
    }
    
    checkEmbeddedSubtitles(videoElement, channel) {
        console.log('=== CHECKING EMBEDDED SUBTITLES ===');
        
        // Wait for video metadata to load
        const checkTracks = () => {
            try {
                console.log('Video textTracks length:', videoElement.textTracks.length);
                
                if (videoElement.textTracks && videoElement.textTracks.length > 0) {
                    console.log('Found embedded subtitle tracks:', videoElement.textTracks.length);
                    
                    for (let i = 0; i < videoElement.textTracks.length; i++) {
                        const track = videoElement.textTracks[i];
                        console.log(`Track ${i}:`, {
                            kind: track.kind,
                            label: track.label,
                            language: track.language,
                            mode: track.mode
                        });
                        
                        // Add embedded track to subtitle list
                        if (track.kind === 'subtitles' || track.kind === 'captions') {
                            const subtitle = {
                                name: track.label || `Embedded ${track.language || 'Unknown'} (${track.kind})`,
                                language: track.language || 'Unknown',
                                source: 'Embedded',
                                track: track,
                                isEmbedded: true
                            };
                            
                            this.addSubtitle(subtitle);
                            console.log('Added embedded subtitle:', subtitle.name);
                        }
                    }
                    
                    // Update provider subtitle status
                    if (videoElement.textTracks.length > 0) {
                        this.updateProviderSubtitleStatus('success', `Found ${videoElement.textTracks.length} embedded subtitle track(s)`);
                    }
                } else {
                    console.log('No embedded subtitle tracks found');
                }
            } catch (error) {
                console.error('Error checking embedded subtitles:', error);
            }
        };
        
        // Check immediately if metadata is already loaded
        if (videoElement.readyState >= 1) {
            checkTracks();
        }
        
        // Also check when metadata loads
        videoElement.addEventListener('loadedmetadata', checkTracks, { once: true });
        
        // Check periodically for a few seconds in case tracks load later
        let checkCount = 0;
        const intervalCheck = setInterval(() => {
            checkCount++;
            if (checkCount > 10) {
                clearInterval(intervalCheck);
                return;
            }
            
            if (videoElement.textTracks && videoElement.textTracks.length > 0) {
                checkTracks();
                clearInterval(intervalCheck);
            }
        }, 500);
    }
    
    async downloadProviderSubtitle(subtitleInfo) {
        try {
            console.log('Downloading provider subtitle:', subtitleInfo.name);
            
            const response = await fetch(subtitleInfo.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const subtitleContent = await response.text();
            
            // Validate subtitle content
            if (!subtitleContent || subtitleContent.length < 10) {
                throw new Error('Invalid subtitle content received');
            }
            
            // Detect subtitle format
            let subtitleType = 'srt';
            if (subtitleContent.includes('WEBVTT')) {
                subtitleType = 'vtt';
            } else if (subtitleContent.includes('[Script Info]') || subtitleContent.includes('Dialogue:')) {
                subtitleType = 'ass';
            }
            
            const subtitle = {
                name: subtitleInfo.name,
                language: subtitleInfo.language,
                source: subtitleInfo.source,
                content: subtitleContent,
                url: subtitleInfo.url,
                type: subtitleType
            };
            
            this.addSubtitle(subtitle);
            this.updateSubtitleList();
            
            console.log(`Provider subtitle "${subtitleInfo.name}" loaded successfully!`);
            return true;
            
        } catch (error) {
            console.error(`Error downloading provider subtitle "${subtitleInfo.name}":`, error);
            return false;
        }
    }

    // Removed API key functions - no longer needed for free subtitle sources

    async searchAddic7ed(query, language) {
        try {
            // Use CORS proxy to access Addic7ed search
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const searchQuery = encodeURIComponent(query);
            const searchUrl = `${corsProxy}${encodeURIComponent(`https://www.addic7ed.com/search.php?search=${searchQuery}&Submit=Search`)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            try {
                const response = await fetch(searchUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const html = await response.text();
                    const results = this.parseAddic7edSearchResults(html, query, language);
                    
                    if (results.length > 0) {
                        return results;
                    }
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.warn('Addic7ed search failed:', error.message);
            }
            
            // If search fails, return empty array (no mock data)
            return [];
        } catch (error) {
            console.warn('Addic7ed search error:', error);
            return [];
        }
    }
    
    parseAddic7edSearchResults(html, query, language) {
        const results = [];
        
        try {
            // Parse HTML to extract subtitle information
            // Look for table rows containing subtitle data
            const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
            const rows = html.match(tableRowRegex) || [];
            
            for (const row of rows) {
                // Skip header rows and non-subtitle rows
                if (!row.includes('download') || !row.includes('.srt')) continue;
                
                // Extract show/movie name
                const nameMatch = row.match(/<a[^>]*href="\/show\/[^"]*"[^>]*>([^<]+)<\/a>/);
                if (!nameMatch) continue;
                
                const showName = nameMatch[1].trim();
                
                // Extract season and episode info
                const seasonEpisodeMatch = row.match(/Season (\d+).*?Episode (\d+)/);
                let seasonEpisode = '';
                if (seasonEpisodeMatch) {
                    seasonEpisode = `S${seasonEpisodeMatch[1].padStart(2, '0')}E${seasonEpisodeMatch[2].padStart(2, '0')}`;
                }
                
                // Extract language
                const langMatch = row.match(/<td[^>]*class="[^"]*language[^"]*"[^>]*>([^<]+)<\/td>/);
                const subtitleLang = langMatch ? langMatch[1].trim() : 'English';
                
                // Skip if language doesn't match (if specified)
                if (language && language !== 'all') {
                    const langCode = language === 'en' ? 'English' : language;
                    if (!subtitleLang.toLowerCase().includes(langCode.toLowerCase())) {
                        continue;
                    }
                }
                
                // Extract download link
                const downloadMatch = row.match(/<a[^>]*href="(\/updated\/\d+\/[^"]+)"[^>]*>Download<\/a>/);
                if (!downloadMatch) continue;
                
                const downloadPath = downloadMatch[1];
                
                // Extract version/release info
                const versionMatch = row.match(/<td[^>]*class="[^"]*NewsTitle[^"]*"[^>]*>([^<]+)<\/td>/);
                const version = versionMatch ? versionMatch[1].trim() : 'Unknown';
                
                // Extract rating if available
                const ratingMatch = row.match(/rating[^>]*>(\d+(?:\.\d+)?)</);
                const rating = ratingMatch ? ratingMatch[1] : '0';
                
                results.push({
                    id: `addic7ed_${Date.now()}_${results.length}`,
                    name: `${showName}${seasonEpisode ? ` ${seasonEpisode}` : ''} - ${version}`,
                    language: subtitleLang,
                    source: 'Addic7ed',
                    downloadUrl: `https://www.addic7ed.com${downloadPath}`,
                    fileId: downloadPath,
                    rating: rating,
                    downloads: 'Unknown',
                    format: 'srt',
                    version: version,
                    isMock: false
                });
            }
        } catch (error) {
            console.error('Error parsing Addic7ed results:', error);
        }
        
        return results;
    }
    






    showError(message, type = 'error') {
        // Enhanced error display with success support
        const errorDiv = document.getElementById('loginError') || document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.className = type === 'success' ? 'success-message' : 'error-message';
        errorDiv.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LightIPTV();
});

// Handle video errors
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    
    videoPlayer.addEventListener('error', (e) => {
        console.error('Video error event:', e);
        console.error('Video error details:', {
            error: videoPlayer.error,
            networkState: videoPlayer.networkState,
            readyState: videoPlayer.readyState,
            currentSrc: videoPlayer.currentSrc
        });
        
        let errorMessage = 'Unable to load the stream';
        if (videoPlayer.error) {
            switch (videoPlayer.error.code) {
                case 1:
                    errorMessage = 'Video loading aborted';
                    break;
                case 2:
                    errorMessage = 'Network error occurred';
                    break;
                case 3:
                    errorMessage = 'Video format not supported';
                    break;
                case 4:
                    errorMessage = 'Video source not found';
                    break;
                default:
                    errorMessage = `Unknown error (code: ${videoPlayer.error.code})`;
            }
        }
        
        const nowPlayingInfo = document.getElementById('nowPlayingInfo');
        nowPlayingInfo.innerHTML = `
            <h4>Playback Error</h4>
            <p>${errorMessage}. Please try another channel.</p>
        `;
    });
    
    videoPlayer.addEventListener('loadstart', () => {
        console.log('Video loading started for:', videoPlayer.src);
    });
    
    videoPlayer.addEventListener('canplay', () => {
        console.log('Video can start playing');
    });
    
    videoPlayer.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded');
    });
    
    videoPlayer.addEventListener('stalled', () => {
        console.warn('Video loading stalled');
    });
    
    videoPlayer.addEventListener('suspend', () => {
        console.warn('Video loading suspended');
    });
});

// Performance optimizations
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker for caching (optional)
        // navigator.serviceWorker.register('/sw.js');
    });
}

// Handle visibility change to pause video when tab is hidden
document.addEventListener('visibilitychange', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    if (document.hidden) {
        videoPlayer.pause();
    }
});