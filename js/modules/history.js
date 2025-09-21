(function(global) {
/**
 * 历史记录模块 - 管理占卜历史记录
 */
global.HistoryModule = (function() {
    // 私有变量
    const historyList = document.getElementById('historyList');
    const filterButtons = document.querySelectorAll('.filter-item');
    const historySearchInput = document.getElementById('historySearchInput');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const totalRecords = document.getElementById('totalRecords');
    const thisWeekRecords = document.getElementById('thisWeekRecords');
    const changingLines = document.getElementById('changingLines');

    let currentFilter = 'all';
    let searchQuery = '';
    const STORAGE_KEY = 'divination_history';

    // 初始化
    function init() {
        try {
            initFilters();
            initSearch();
            initClearAction();
            updateHistoryDisplay();
            updateStats();
        } catch (error) {
            YizhiApp.errors.handle(error, 'History Module Init');
        }
    }

    // 激活时的操作
    function onActivate() {
        updateHistoryDisplay();
        updateStats();
    }

    // 初始化筛选器
    function initFilters() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');

                // 更新按钮状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // 更新当前筛选器
                currentFilter = filter;

                // 重新加载历史记录
                updateHistoryDisplay();
            });
        });
    }

    // 初始化搜索
    function initSearch() {
        if (historySearchInput) {
            historySearchInput.addEventListener('input', YizhiApp.utils.debounce((e) => {
                searchQuery = e.target.value.trim();
                updateHistoryDisplay();
            }, 300));
        }
    }

    // 初始化清空按钮
    function initClearAction() {
        clearHistoryBtn?.addEventListener('click', clearHistory);
    }

    // 添加历史记录
    function addRecord(record) {
        try {
            let history = getHistoryRecords();
            history.unshift(record);

            // 限制历史记录数量
            if (history.length > 200) {
                history = history.slice(0, 200);
            }

            YizhiApp.storage.setItem(STORAGE_KEY, history);
            updateHistoryDisplay();
            updateStats();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Add History Record');
        }
    }

    // 获取历史记录
    function getHistoryRecords() {
        return YizhiApp.storage.getItem(STORAGE_KEY, []);
    }

    // 获取筛选后的历史记录
    function getFilteredRecords() {
        try {
            let allRecords = getHistoryRecords();

            // 应用时间筛选
            if (currentFilter !== 'all') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                allRecords = allRecords.filter(record => {
                    const recordDate = new Date(record.date);

                    switch (currentFilter) {
                        case 'today':
                            return recordDate >= today;
                        case 'week':
                            return recordDate >= weekStart;
                        case 'month':
                            return recordDate >= monthStart;
                        default:
                            return true;
                    }
                });
            }

            // 应用搜索筛选
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                allRecords = allRecords.filter(record => {
                    return record.hexagram.name.toLowerCase().includes(query) ||
                           record.hexagram.explanation.toLowerCase().includes(query) ||
                           (record.notes && record.notes.toLowerCase().includes(query));
                });
            }

            return allRecords;
        } catch (error) {
            YizhiApp.errors.handle(error, 'Get Filtered Records');
            return [];
        }
    }

    // 删除历史记录
    function deleteRecord(id) {
        try {
            let history = getHistoryRecords();
            history = history.filter(record => record.id !== id);
            YizhiApp.storage.setItem(STORAGE_KEY, history);
            updateHistoryDisplay();
            updateStats();

            YizhiApp.getModule('notification')?.show('info', '删除成功', '历史记录已删除。');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Delete History Record');
        }
    }

    // 更新历史记录显示
    function updateHistoryDisplay() {
        if (!historyList) return;

        try {
            const records = getFilteredRecords();

            if (records.length === 0) {
                historyList.innerHTML = createEmptyState();
                return;
            }

            const fragment = document.createDocumentFragment();
            records.forEach(record => {
                const historyItem = createHistoryItem(record);
                fragment.appendChild(historyItem);
            });

            historyList.innerHTML = '';
            historyList.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update History Display');
        }
    }

    // 创建空状态
    function createEmptyState() {
        return `
            <div class="empty-history">
                <svg class="empty-icon" viewBox="0 0 24 24">
                    <path d="M13,3C9.1,3,6,6.1,6,10h1.6L5,13.5L2.4,10H4c0-5,4-9,9-9s9,4,9,9s-4,9-9,9c-2.4,0-4.6-0.9-6.3-2.6L5.3,17.8C7.5,20.1,10.1,21,13,21c5.5,0,10-4.5,10-10S18.5,3,13,3z"></path>
                </svg>
                <h3>暂无历史记录</h3>
                <p>${searchQuery ? '没有找到匹配的记录' : '您还没有保存任何占卜记录'}</p>
                ${!searchQuery ? '<button class="btn btn-primary" onclick="document.querySelector(\'[data-section=divination]\').click()">开始占卜</button>' : ''}
            </div>
        `;
    }

    // 创建历史记录项
    function createHistoryItem(record) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const changingText = record.changingLinesCount > 0
            ? `<span class="changing-indicator">${record.changingLinesCount}变</span>`
            : '';

        historyItem.innerHTML = `
            <div class="history-item-content">
                <div class="history-date">${record.date}</div>
                <div class="history-item-header">
                    <div class="history-hexagram-name">${record.hexagram.name}</div>
                    <div class="history-unicode">${record.hexagram.unicode || ''}</div>
                </div>
                <div class="history-text">${record.hexagram.explanation}</div>
                ${changingText}
                ${record.notes ? `<div class="history-notes">${record.notes}</div>` : ''}
                <div class="history-actions">
                    <button class="history-action view-action tooltip" data-tooltip="查看详情" aria-label="查看详情">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path>
                        </svg>
                    </button>
                    <button class="history-action delete-action tooltip" data-tooltip="删除记录" aria-label="删除记录">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // 绑定事件
        const viewBtn = historyItem.querySelector('.view-action');
        const deleteBtn = historyItem.querySelector('.delete-action');

        viewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            YizhiApp.getModule('modal')?.show(record.hexagram);
        });

        deleteBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await YizhiApp.confirm.show(
                '确认删除',
                '确定要删除这条历史记录吗？',
                { danger: true }
            );
            if (confirmed) {
                deleteRecord(record.id);
            }
        });

        // 点击整个记录项查看详情
        historyItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(record.hexagram);
        });

        return historyItem;
    }

    // 更新统计信息
    function updateStats() {
        try {
            const allRecords = getHistoryRecords();
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());

            const weekRecords = allRecords.filter(record => {
                return new Date(record.date) >= weekStart;
            });

            const changingRecords = allRecords.filter(record => {
                return record.changingLinesCount > 0;
            });

            if (totalRecords) totalRecords.textContent = allRecords.length;
            if (thisWeekRecords) thisWeekRecords.textContent = weekRecords.length;
            if (changingLines) changingLines.textContent = changingRecords.length;
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update Stats');
        }
    }

    // 清空历史记录
    async function clearHistory() {
        try {
            const confirmed = await YizhiApp.confirm.show(
                '确认清空',
                '确定要清空所有历史记录吗？此操作不可恢复。',
                { danger: true, okText: '清空全部' }
            );

            if (confirmed) {
                YizhiApp.storage.removeItem(STORAGE_KEY);
                updateHistoryDisplay();
                updateStats();

                YizhiApp.getModule('notification')?.show('success', '清空成功',
                    '所有历史记录已被清空。');
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Clear History');
        }
    }

    return {
        init,
        onActivate,
        addRecord,
        getHistoryRecords,
        deleteRecord,
        clearHistory
    };
})();

/**
 * 卦象分析工具模块 - 管理卦象组合分析
 */
})(window);
