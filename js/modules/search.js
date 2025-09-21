(function(global) {
/**
 * 搜索模块 - 管理卦象搜索功能
 */
global.SearchModule = (function() {
    // 私有变量
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchTags = document.querySelectorAll('.search-tag');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    const resultCount = document.getElementById('resultCount');
    const featuredHexagrams = document.getElementById('featuredHexagrams');

    let currentQuery = '';
    let currentCategory = '';
    let searchHistory = [];

    // 初始化
    function init() {
        try {
            initSearchInput();
            initSearchTags();
            initCategoryFilter();
            loadSearchHistory();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                initFeaturedHexagrams();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Search Module Init');
        }
    }

    // 初始化搜索输入框
    function initSearchInput() {
        if (!searchInput) return;

        searchInput.addEventListener('input', YizhiApp.utils.debounce((e) => {
            currentQuery = e.target.value.trim();
            updateClearButton();
            handleSearch();
        }, 300));

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });

        searchClear?.addEventListener('click', () => {
            clearSearch();
        });
    }

    // 初始化搜索标签
    function initSearchTags() {
        searchTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const keyword = tag.getAttribute('data-keyword');
                searchInput.value = keyword;
                currentQuery = keyword;
                updateClearButton();
                handleSearch();
                addToSearchHistory(keyword);
            });
        });
    }

    // 初始化分类筛选
    function initCategoryFilter() {
        categoryFilter?.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            handleSearch();
        });
    }

    // 激活时的操作
    function onActivate() {
        searchInput?.focus();
        if (currentQuery) {
            handleSearch();
        }
    }

    // 处理搜索
    function handleSearch() {
        try {
            if (!searchResults) return;

            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                showLoadingResults();
                return;
            }

            if (!currentQuery && !currentCategory) {
                showEmptyResults();
                hideStats();
                return;
            }

            const results = performSearch();
            displayResults(results);
            updateStats(results.length);

            // 添加到搜索历史
            if (currentQuery) {
                addToSearchHistory(currentQuery);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Handle Search');
            showErrorResults();
        }
    }

    // 执行搜索
    function performSearch() {
        const hexagramDataService = YizhiApp.getModule('hexagramData');
        let results = [];

        if (currentQuery) {
            results = hexagramDataService.searchHexagrams(currentQuery);
        } else {
            results = hexagramDataService.getAllHexagrams();
        }

        // 应用分类筛选
        if (currentCategory) {
            results = results.filter(hexagram => {
                return matchesCategory(hexagram, currentCategory);
            });
        }

        return results;
    }

    // 检查是否匹配分类
    function matchesCategory(hexagram, category) {
        // 简单的分类匹配逻辑，实际应用中可能需要更复杂的规则
        switch (category) {
            case 'fortune':
                return ['吉', '利', '亨', '元'].some(char =>
                    hexagram.explanation.includes(char));
            case 'career':
                return ['进', '升', '行', '动'].some(char =>
                    hexagram.explanation.includes(char));
            case 'relationship':
                return ['和', '合', '交', '比'].some(char =>
                    hexagram.explanation.includes(char));
            default:
                return true;
        }
    }

    // 显示搜索结果
    function displayResults(results) {
        if (results.length === 0) {
            showNoResults();
            return;
        }

        const fragment = document.createDocumentFragment();
        results.forEach(hexagram => {
            const searchItem = createSearchItem(hexagram);
            fragment.appendChild(searchItem);
        });

        searchResults.innerHTML = '';
        searchResults.appendChild(fragment);
    }

    // 创建搜索结果项
    function createSearchItem(hexagram) {
        const searchItem = document.createElement('div');
        searchItem.className = 'search-item';

        // 高亮搜索关键词
        const highlightedName = highlightText(hexagram.name, currentQuery);
        const highlightedExplanation = highlightText(hexagram.explanation, currentQuery);

        searchItem.innerHTML = `
            <div class="search-item-content">
                <div class="search-item-header">
                    <div class="search-item-name">${highlightedName}</div>
                    <div class="search-item-unicode">${hexagram.unicode || ''}</div>
                </div>
                <div class="search-item-explanation">${highlightedExplanation}</div>
                <div class="search-item-meta">
                    <span class="search-item-id">第${hexagram.id}卦</span>
                    ${hexagram.upperTrigram && hexagram.lowerTrigram ? 
                        `<span class="search-item-trigrams">${hexagram.upperTrigram}${hexagram.lowerTrigram}</span>` : ''}
                </div>
            </div>
        `;

        searchItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return searchItem;
    }

    // 高亮文本
    function highlightText(text, query) {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 显示空结果
    function showEmptyResults() {
        searchResults.innerHTML = `
            <div class="search-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
                <h3>开始搜索卦象</h3>
                <p>输入卦名、关键词或使用标签来查找相关卦象</p>
            </div>
        `;
    }

    // 显示无结果
    function showNoResults() {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <svg class="no-results-icon" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
                <h3>未找到相关卦象</h3>
                <p>尝试使用其他关键词或检查拼写是否正确</p>
                <div class="search-suggestions">
                    <p>建议搜索：</p>
                    <div class="suggestion-tags">
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='乾';document.getElementById('searchInput').dispatchEvent(new Event('input'))">乾</span>
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='坤';document.getElementById('searchInput').dispatchEvent(new Event('input'))">坤</span>
                        <span class="suggestion-tag" onclick="document.getElementById('searchInput').value='吉';document.getElementById('searchInput').dispatchEvent(new Event('input'))">吉</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示加载结果
    function showLoadingResults() {
        searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>正在搜索卦象...</p>
            </div>
        `;
    }

    // 显示错误结果
    function showErrorResults() {
        searchResults.innerHTML = `
            <div class="search-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <h3>搜索出现错误</h3>
                <p>请稍后重试或联系技术支持</p>
            </div>
        `;
    }

    // 更新统计信息
    function updateStats(count) {
        if (searchStats) {
            if (count > 0) {
                searchStats.style.display = 'block';
                if (resultCount) {
                    resultCount.textContent = count;
                }
            } else {
                hideStats();
            }
        }
    }

    // 隐藏统计信息
    function hideStats() {
        if (searchStats) {
            searchStats.style.display = 'none';
        }
    }

    // 更新清除按钮
    function updateClearButton() {
        if (searchClear) {
            searchClear.style.display = currentQuery ? 'flex' : 'none';
        }
    }

    // 清除搜索
    function clearSearch() {
        currentQuery = '';
        searchInput.value = '';
        categoryFilter.value = '';
        currentCategory = '';
        updateClearButton();
        showEmptyResults();
        hideStats();
    }

    // 添加到搜索历史
    function addToSearchHistory(query) {
        if (!query || searchHistory.includes(query)) return;

        searchHistory.unshift(query);
        if (searchHistory.length > 10) {
            searchHistory = searchHistory.slice(0, 10);
        }

        saveSearchHistory();
    }

    // 加载搜索历史
    function loadSearchHistory() {
        searchHistory = YizhiApp.storage.getItem('search_history', []);
    }

    // 保存搜索历史
    function saveSearchHistory() {
        YizhiApp.storage.setItem('search_history', searchHistory);
    }

    // 初始化精选卦象
    function initFeaturedHexagrams() {
        if (!featuredHexagrams) return;

        try {
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) return;

            const featuredIds = [1, 2, 11, 12, 24, 44]; // 经典卦象
            const fragment = document.createDocumentFragment();

            featuredIds.forEach(id => {
                const hexagram = hexagramDataService.getHexagramById(id);
                if (hexagram) {
                    const featuredItem = createFeaturedHexagramItem(hexagram);
                    fragment.appendChild(featuredItem);
                }
            });

            featuredHexagrams.innerHTML = '';
            featuredHexagrams.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Init Featured Hexagrams');
        }
    }

    // 创建精选卦象项
    function createFeaturedHexagramItem(hexagram) {
        const item = document.createElement('div');
        item.className = 'featured-hexagram-item';

        item.innerHTML = `
            <div class="featured-symbol">${hexagram.unicode || ''}</div>
            <div class="featured-info">
                <div class="featured-name">${hexagram.name}</div>
                <div class="featured-explanation">${hexagram.explanation}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return item;
    }

    return {
        init,
        onActivate,
        search: handleSearch,
        clearSearch
    };
})();

/**
 * 模态框模块 - 管理卦象详情模态框
 */
})(window);
