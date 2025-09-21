(function(global) {
/**
 * 模态框模块 - 管理卦象详情模态框
 */
global.ModalModule = (function() {
    // 私有变量
    const modal = document.getElementById('hexagramModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const closeModal = document.getElementById('closeModal');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    let currentHexagram = null;
    let isVisible = false;

    // 初始化
    function init() {
        try {
            bindEvents();
            initKeyboardEvents();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Modal Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        closeModal?.addEventListener('click', hide);
        modalBackdrop?.addEventListener('click', hide);
        modalSaveBtn?.addEventListener('click', saveCurrentHexagram);

        // 点击模态框内容区域不关闭
        modal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 初始化键盘事件
    function initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (!isVisible) return;

            switch (e.key) {
                case 'Escape':
                    hide();
                    break;
                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        saveCurrentHexagram();
                    }
                    break;
                default:
                    break;
            }
        });
    }

    // 显示模态框
    function show(hexagram) {
        if (!hexagram || !modal) {
            console.warn('Modal: Invalid hexagram or modal element not found');
            return;
        }

        try {
            currentHexagram = hexagram;

            // 显示加载状态
            showLoading();

            // 显示模态框
            modal.style.display = 'flex';
            isVisible = true;

            // 设置标题
            const title = `${hexagram.name || '未知卦象'} · ${hexagram.explanation || ''}`;
            if (modalTitle) {
                modalTitle.textContent = title;
            }

            // 异步加载内容
            setTimeout(() => {
                loadModalContent(hexagram);
            }, 100);

            // 焦点管理
            closeModal?.focus();

            // 禁用背景滚动
            document.body.style.overflow = 'hidden';

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Modal');
        }
    }

    // 隐藏模态框
    function hide() {
        if (!modal || !isVisible) return;

        try {
            modal.style.display = 'none';
            isVisible = false;
            currentHexagram = null;

            // 恢复背景滚动
            document.body.style.overflow = '';

            // 清空内容
            if (modalContent) {
                modalContent.innerHTML = '';
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hide Modal');
        }
    }

    // 显示加载状态
    function showLoading() {
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>加载卦象信息中...</p>
            </div>
        `;
    }

    // 加载模态框内容
    function loadModalContent(hexagram) {
        if (!modalContent) return;

        try {
            // 处理爻辞
            let linesHTML = '';
            if (hexagram.lines && hexagram.lines.length > 0) {
                hexagram.lines.forEach(line => {
                    const position = line.position || 0;
                    const content = line.content || '暂无爻辞';

                    linesHTML += `
                        <div class="modal-line-reading">
                            <div class="modal-line-position">第${position}爻</div>
                            <p class="modal-line-content">${content}</p>
                        </div>
                    `;
                });
            } else {
                linesHTML = '<p class="modal-no-data">暂无爻辞数据</p>';
            }

            // 获取上下卦信息
            let trigramInfo = '';
            if (hexagram.upperTrigram && hexagram.lowerTrigram) {
                const hexagramDataService = YizhiApp.getModule('hexagramData');
                if (hexagramDataService?.isInitialized) {
                    const upperBagua = hexagramDataService.getBagua(hexagram.upperTrigram);
                    const lowerBagua = hexagramDataService.getBagua(hexagram.lowerTrigram);

                    if (upperBagua && lowerBagua) {
                        trigramInfo = `
                            <div class="modal-trigram-info">
                                <div class="trigram-item">
                                    <span class="trigram-symbol">${upperBagua.symbol}</span>
                                    <span class="trigram-name">上卦: ${hexagram.upperTrigram}</span>
                                    <span class="trigram-nature">${upperBagua.nature}</span>
                                </div>
                                <div class="trigram-item">
                                    <span class="trigram-symbol">${lowerBagua.symbol}</span>
                                    <span class="trigram-name">下卦: ${hexagram.lowerTrigram}</span>
                                    <span class="trigram-nature">${lowerBagua.nature}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            // 获取相关卦象
            let relationsHTML = '';
            if (hexagram.id && YizhiApp.getModule('hexagramData')?.isInitialized) {
                const related = YizhiApp.getModule('hexagramData').getRelatedHexagrams(hexagram.id);

                if (Object.keys(related).length > 0) {
                    const relationTypes = {
                        opposite: '对宫卦',
                        inverse: '综卦',
                        mutual: '互卦'
                    };

                    relationsHTML = '<div class="modal-relations"><h4 class="modal-section-title">相关卦象</h4><div class="modal-relation-items">';

                    for (const [type, relHexagram] of Object.entries(related)) {
                        if (!relHexagram) continue;

                        relationsHTML += `
                            <div class="modal-relation-item" data-hexagram-id="${relHexagram.id}">
                                <div class="relation-symbol">${relHexagram.unicode || ''}</div>
                                <div class="relation-info">
                                    <div class="relation-name">${relHexagram.name || '未知卦象'}</div>
                                    <div class="relation-type">${relationTypes[type] || type}</div>
                                </div>
                            </div>
                        `;
                    }

                    relationsHTML += '</div></div>';
                }
            }

            // 构建完整内容
            modalContent.innerHTML = `
                <div class="modal-hexagram-header">
                    <div class="modal-hexagram-unicode">${hexagram.unicode || ''}</div>
                    <div class="modal-hexagram-info">
                        <h2 class="modal-hexagram-name">${hexagram.name || '未知卦象'}</h2>
                        <p class="modal-hexagram-explanation">${hexagram.explanation || ''}</p>
                    </div>
                </div>

                ${trigramInfo}

                <div class="modal-section">
                    <h3 class="modal-section-title">卦象概述</h3>
                    <p class="modal-section-content">${hexagram.overview || '暂无数据'}</p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">详细解析</h3>
                    <p class="modal-section-content">${hexagram.detail || '暂无数据'}</p>
                </div>

                <div class="modal-section">
                    <h3 class="modal-section-title">爻辞解读</h3>
                    <div class="modal-lines-content">
                        ${linesHTML}
                    </div>
                </div>

                ${relationsHTML}
            `;

            // 绑定相关卦象点击事件
            bindRelationEvents();

        } catch (error) {
            YizhiApp.errors.handle(error, 'Load Modal Content');
            showErrorContent();
        }
    }

    // 绑定相关卦象事件
    function bindRelationEvents() {
        const relationItems = modalContent?.querySelectorAll('.modal-relation-item');
        relationItems?.forEach(item => {
            item.addEventListener('click', () => {
                const hexagramId = parseInt(item.getAttribute('data-hexagram-id'));
                if (hexagramId) {
                    const hexagramDataService = YizhiApp.getModule('hexagramData');
                    const relatedHexagram = hexagramDataService?.getHexagramById(hexagramId);
                    if (relatedHexagram) {
                        show(relatedHexagram);
                    }
                }
            });
        });
    }

    // 显示错误内容
    function showErrorContent() {
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <h3>加载失败</h3>
                <p>无法加载卦象信息，请稍后重试</p>
                <button class="btn btn-primary btn-sm" onclick="location.reload()">刷新页面</button>
            </div>
        `;
    }

    // 保存当前卦象
    function saveCurrentHexagram() {
        if (!currentHexagram) return;

        try {
            // 创建历史记录项
            const historyItem = {
                id: YizhiApp.utils.generateId(),
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: currentHexagram,
                lines: [], // 模态框中的卦象可能没有具体的爻线信息
                notes: '通过查询保存',
                source: 'modal'
            };

            YizhiApp.getModule('history')?.addRecord(historyItem);
            YizhiApp.getModule('notification')?.show('success', '保存成功',
                `卦象「${currentHexagram.name}」已保存到历史记录。`);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Save Current Hexagram');
        }
    }

    return {
        init,
        show,
        hide,
        get isVisible() { return isVisible; },
        get currentHexagram() { return currentHexagram; }
    };
})();

/**
 * 帮助模块 - 管理帮助和引导
 */
})(window);
