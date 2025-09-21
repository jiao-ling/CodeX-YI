/**
 * 易之 V7.0 - 高级易经演算系统
 * 功能模块实现
 *
 * @version 7.0.0
 * @author 鲛澪
 * @description 包含所有核心功能模块的实现
 */

/**
 * 主题模块 - 管理应用程序的主题
 */
const ThemeModule = (function() {
    // 私有变量
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const STORAGE_KEY = 'theme';

    // 初始化
    function init() {
        try {
            // 检查存储中的主题设置
            const savedTheme = YizhiApp.storage.getItem(STORAGE_KEY);
            if (savedTheme === 'dark') {
                body.setAttribute('data-theme', 'dark');
            }

            // 为主题切换按钮添加事件监听器
            if (themeToggle) {
                themeToggle.addEventListener('click', toggleTheme);
                themeToggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTheme();
                    }
                });
            }

            // 监听系统主题变化
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addListener(handleSystemThemeChange);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Theme Module Init');
        }
    }

    // 切换主题
    function toggleTheme() {
        try {
            const currentTheme = getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Theme Toggle');
        }
    }

    // 设置主题
    function setTheme(theme) {
        try {
            if (theme === 'dark') {
                body.setAttribute('data-theme', 'dark');
                YizhiApp.storage.setItem(STORAGE_KEY, 'dark');
            } else {
                body.removeAttribute('data-theme');
                YizhiApp.storage.setItem(STORAGE_KEY, 'light');
            }

            // 触发主题变化事件
            YizhiApp.events.emit('theme:changed', { theme });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Set Theme');
        }
    }

    // 获取当前主题
    function getCurrentTheme() {
        return body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    // 处理系统主题变化
    function handleSystemThemeChange(e) {
        // 如果用户没有手动设置主题，则跟随系统
        const userTheme = YizhiApp.storage.getItem(STORAGE_KEY);
        if (!userTheme) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    }

    return {
        init,
        setTheme,
        getCurrentTheme,
        toggleTheme
    };
})();

/**
 * 通知模块 - 管理应用程序中的通知
 */
const NotificationModule = (function() {
    // 私有变量
    const container = document.getElementById('notificationContainer');
    let notificationCount = 0;
    const maxNotifications = 5;
    const notifications = new Map();

    // 初始化
    function init() {
        try {
            // 确保容器存在
            if (!container) {
                console.warn('Notification container not found');
                return;
            }

            // 监听网络状态变化
            YizhiApp.events.on('network:offline', () => {
                show('warning', '网络连接', '网络连接已断开，某些功能可能受到影响。');
            });

            YizhiApp.events.on('network:online', () => {
                show('success', '网络连接', '网络连接已恢复。');
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Notification Module Init');
        }
    }

    // 显示通知
    function show(type, title, message, duration = 5000, options = {}) {
        try {
            if (notificationCount >= maxNotifications) {
                // 移除最旧的通知
                const oldestNotification = notifications.values().next().value;
                if (oldestNotification) {
                    removeNotification(oldestNotification.element);
                }
            }

            notificationCount++;

            // 创建通知元素
            const notification = document.createElement('div');
            const notificationId = YizhiApp.utils.generateId();
            notification.className = `notification notification-${type}`;
            notification.setAttribute('role', 'alert');
            notification.setAttribute('data-id', notificationId);

            // 添加通知图标
            const iconPath = getIconPath(type);

            // 设置通知内容
            notification.innerHTML = `
                <svg class="notification-icon icon" viewBox="0 0 24 24" aria-hidden="true">
                    ${iconPath}
                </svg>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(title)}</div>
                    <div class="notification-message">${escapeHtml(message)}</div>
                    ${options.actions ? createActionButtons(options.actions) : ''}
                </div>
                <button class="notification-close" aria-label="关闭通知">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                    </svg>
                </button>
            `;

            // 添加到容器
            container.appendChild(notification);

            // 保存通知引用
            notifications.set(notificationId, {
                element: notification,
                timestamp: Date.now()
            });

            // 添加关闭通知的事件监听器
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                removeNotification(notification);
            });

            // 处理操作按钮
            if (options.actions) {
                const actionBtns = notification.querySelectorAll('.notification-action');
                actionBtns.forEach((btn, index) => {
                    btn.addEventListener('click', () => {
                        const action = options.actions[index];
                        if (action.handler) {
                            action.handler();
                        }
                        if (action.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    });
                });
            }

            // 点击通知主体
            if (options.onClick) {
                notification.addEventListener('click', (e) => {
                    if (!e.target.closest('.notification-close') && !e.target.closest('.notification-action')) {
                        options.onClick();
                        if (options.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    }
                });
            }

            // 设置自动消失
            if (duration > 0) {
                setTimeout(() => {
                    if (container.contains(notification)) {
                        removeNotification(notification);
                    }
                }, duration);
            }

            // 添加入场动画
            requestAnimationFrame(() => {
                notification.classList.add('notification-enter');
            });

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Notification');
        }
    }

    // 移除通知
    function removeNotification(notification) {
        try {
            const notificationId = notification.getAttribute('data-id');

            notification.classList.add('exiting');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                    notificationCount--;

                    if (notificationId) {
                        notifications.delete(notificationId);
                    }
                }
            }, 300); // 与通知退出动画持续时间匹配
        } catch (error) {
            YizhiApp.errors.handle(error, 'Remove Notification');
        }
    }

    // 获取图标路径
    function getIconPath(type) {
        const icons = {
            success: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path>',
            info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>',
            warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>',
            error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>'
        };
        return icons[type] || icons.info;
    }

    // 创建操作按钮
    function createActionButtons(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action btn btn-sm ${action.className || ''}">${escapeHtml(action.text)}</button>
                `).join('')}
            </div>
        `;
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清除所有通知
    function clearAll() {
        try {
            const allNotifications = container.querySelectorAll('.notification');
            allNotifications.forEach(notification => {
                removeNotification(notification);
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Clear All Notifications');
        }
    }

    return {
        init,
        show,
        clearAll
    };
})();

/**
 * 卦象数据服务 - 管理易经卦象数据
 */
const HexagramDataService = (function() {
    const DATA_URL = 'data/hexagrams.json';
    let baguaData = {};
    let rawHexagramData = {};
    let hexagramMap = {};
    let isInitialized = false;

    // 初始化
    async function init() {
        try {
            if (isInitialized) return;

            YizhiApp.performance.start('hexagram_data_init');

            await loadHexagramData();
            await processHexagramData();

            isInitialized = true;
            YizhiApp.performance.end('hexagram_data_init');

            YizhiApp.events.emit('hexagram-data:ready');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hexagram Data Service Init');
        }
    }

    async function loadHexagramData() {
        if (Object.keys(rawHexagramData).length > 0 && Object.keys(baguaData).length > 0) {
            return;
        }

        const response = await fetch(DATA_URL, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load hexagram dataset: ${response.status}`);
        }

        const data = await response.json();
        baguaData = data?.bagua || {};
        rawHexagramData = data?.hexagrams || {};

        if (!rawHexagramData || Object.keys(rawHexagramData).length === 0) {
            throw new Error('Hexagram dataset is empty');
        }
    }

    // 处理卦象数据
    async function processHexagramData() {
        if (!rawHexagramData || Object.keys(rawHexagramData).length === 0) {
            throw new Error('Hexagram dataset is not loaded');
        }

        hexagramMap = YizhiApp.utils.deepClone(rawHexagramData);

        for (const key in hexagramMap) {
            const id = parseInt(key);
            hexagramMap[key].id = id;

            // 计算上卦和下卦
            calculateTrigrams(hexagramMap[key]);

            // 计算相关卦象关系
            calculateRelations(hexagramMap[key]);
        }
    }

    // 计算卦象的上下卦
    function calculateTrigrams(hexagram) {
        const binary = hexagram.binary;
        if (binary && binary.length === 6) {
            const upperBinary = binary.slice(0, 3);
            const lowerBinary = binary.slice(3);

            hexagram.upperTrigram = getBaguaByBinary(upperBinary);
            hexagram.lowerTrigram = getBaguaByBinary(lowerBinary);
        }
    }

    // 计算关系数据结构
    function calculateRelations(hexagram) {
        hexagram.relations = {};
        hexagram.relations.opposite = calculateOpposite(hexagram.binary);
        hexagram.relations.inverse = calculateInverse(hexagram.binary);
        hexagram.relations.mutual = calculateMutual(hexagram.binary);
    }

    // 计算对宫卦
    function calculateOpposite(binary) {
        const oppositeBinary = binary.split('').map(bit => bit === '1' ? '0' : '1').join('');
        return getHexagramIdByBinary(oppositeBinary);
    }

    // 计算综卦
    function calculateInverse(binary) {
        const inverseBinary = binary.split('').reverse().join('');
        return getHexagramIdByBinary(inverseBinary);
    }

    // 计算互卦
    function calculateMutual(binary) {
        const third = binary.charAt(2);
        const fourth = binary.charAt(3);
        const fifth = binary.charAt(4);
        const second = binary.charAt(1);

        const mutualBinary = second + third + fourth + third + fourth + fifth;
        return getHexagramIdByBinary(mutualBinary);
    }

    // 通过二进制获取卦象ID
    function getHexagramIdByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                return parseInt(key);
            }
        }
        return 1;
    }

    // 根据二进制代码获取八卦
    function getBaguaByBinary(binary) {
        for (const name in baguaData) {
            if (baguaData[name].binary === binary) {
                return name;
            }
        }
        return null;
    }

    // 公共API方法
    function getHexagramByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                const hexagram = hexagramMap[key];
                if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                    calculateTrigrams(hexagram);
                }
                return hexagram;
            }
        }
        return null;
    }

    function getHexagramById(id) {
        const hexagram = hexagramMap[id] || null;
        if (hexagram) {
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (!hexagram.relations) {
                calculateRelations(hexagram);
            }
        }
        return hexagram;
    }

    function getBaguaData() {
        return baguaData;
    }

    function getBagua(name) {
        return baguaData[name] || null;
    }

    function getHexagramByTrigrams(upper, lower) {
        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (hexagram.upperTrigram === upper && hexagram.lowerTrigram === lower) {
                return hexagram;
            }
        }
        return null;
    }

    function searchHexagrams(keyword) {
        keyword = keyword.toLowerCase();
        const results = [];

        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }

            if (hexagram.name.toLowerCase().includes(keyword) ||
                hexagram.explanation.toLowerCase().includes(keyword) ||
                (hexagram.overview && hexagram.overview.toLowerCase().includes(keyword)) ||
                (hexagram.detail && hexagram.detail.toLowerCase().includes(keyword))) {
                results.push(hexagram);
            }
        }

        return results;
    }

    function getRelatedHexagrams(hexagramId) {
        const hexagram = hexagramMap[hexagramId];
        if (!hexagram || !hexagram.relations) {
            return {};
        }

        const related = {};
        for (const [type, id] of Object.entries(hexagram.relations)) {
            related[type] = getHexagramById(id);
        }

        return related;
    }

    function getAllHexagrams() {
        return Object.values(hexagramMap);
    }

    return {
        init,
        getHexagramByBinary,
        getHexagramById,
        getBaguaData,
        getBagua,
        getHexagramByTrigrams,
        searchHexagrams,
        getRelatedHexagrams,
        getAllHexagrams,
        get isInitialized() { return isInitialized; }
    };
})();

/**
 * 占卜模块 - 管理铜钱投掷和卦象生成
 */
const DivinationModule = (function() {
    // 私有变量
    const throwCoinBtn = document.getElementById('throwCoinBtn');
    const changeHexagramBtn = document.getElementById('changeHexagramBtn');
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');
    const hexagramContainer = document.getElementById('hexagramContainer');
    const hexagramNameDisplay = document.getElementById('hexagramName');
    const hexagramUnicodeDisplay = document.getElementById('hexagramUnicode');
    const hexagramExplanationDisplay = document.getElementById('hexagramExplanation');
    const upperTrigramInfo = document.getElementById('upperTrigramInfo');
    const lowerTrigramInfo = document.getElementById('lowerTrigramInfo');
    const coinsDisplay = document.getElementById('coinsDisplay');
    const coinsResult = document.getElementById('coinsResult');
    const overviewContent = document.getElementById('overviewContent');
    const detailContent = document.getElementById('detailContent');
    const linesContent = document.getElementById('linesContent');
    const relationsContent = document.getElementById('relationItems');
    const progressBar = document.getElementById('progressBar');
    const progressCount = document.getElementById('progressCount');
    const throwSubtitle = document.getElementById('throwSubtitle');

    // 步骤指引
    const steps = {
        step1: document.getElementById('step1'),
        step2: document.getElementById('step2'),
        step3: document.getElementById('step3'),
        step4: document.getElementById('step4')
    };

    let lines = [];
    let transformed = false;
    let animationInProgress = false;
    const positionCode = "010101";

    // 初始化
    function init() {
        try {
            bindEvents();
            initializeUI();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                updateHexagramDisplay();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Divination Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        throwCoinBtn?.addEventListener('click', handleThrowCoins);
        changeHexagramBtn?.addEventListener('click', toggleChangingLines);
        resetBtn?.addEventListener('click', handleReset);
        saveBtn?.addEventListener('click', saveToHistory);
    }

    // 初始化UI
    function initializeUI() {
        resetDivination();
        updateProgress(0);
        updateStep(1);
    }

    // 激活时的处理
    function onActivate() {
        // 检查是否有未完成的占卜
        if (lines.length > 0 && lines.length < 6) {
            YizhiApp.getModule('notification')?.show('info', '继续占卜',
                `您有一个进行到第${lines.length}爻的占卜，可以继续完成。`);
        }
    }

    // 处理投掷铜钱
    async function handleThrowCoins() {
        if (animationInProgress || lines.length >= 6) return;

        try {
            animationInProgress = true;
            throwCoinBtn.disabled = true;

            updateStep(1);
            await throwThreeCoins();

            updateProgress((lines.length / 6) * 100);
            updateProgressCount();
            updateThrowButtonText();

            if (lines.length >= 3) {
                updateStep(2);
            }

            if (lines.length === 6) {
                handleDivinationComplete();
            }

        } catch (error) {
            YizhiApp.errors.handle(error, 'Throw Coins');
        } finally {
            animationInProgress = false;
            if (lines.length < 6) {
                throwCoinBtn.disabled = false;
            }
        }
    }

    // 投掷三枚铜钱
    function throwThreeCoins() {
        return new Promise((resolve) => {
            // 清空上一次的铜钱显示
            if (coinsDisplay) {
                coinsDisplay.innerHTML = '';
            }

            // 创建三个铜钱
            const coinElements = [];
            for (let i = 0; i < 3; i++) {
                const coin = createCoinElement();
                coinElements.push(coin);
                coinsDisplay?.appendChild(coin);
            }

            // 延迟开始动画
            setTimeout(() => {
                const results = [];

                coinElements.forEach((coin, index) => {
                    const isHeads = Math.random() < 0.5;
                    const finalRotation = isHeads ? '0deg' : '180deg';

                    results.push(isHeads ? 3 : 2);

                    coin.classList.add('flipping');
                    coin.style.setProperty('--final-rotation', finalRotation);
                });

                // 等待动画结束
                setTimeout(() => {
                    const sum = results.reduce((a, b) => a + b, 0);
                    const lineInfo = interpretCoinResult(sum);

                    lines.push(lineInfo);
                    displayCoinResult(results, lineInfo);
                    renderHexagram();
                    updateHexagramDisplay();

                    resolve();
                }, 1500);
            }, 100);
        });
    }

    // 创建铜钱元素
    function createCoinElement() {
        const coinContainer = document.createElement('div');
        coinContainer.className = 'coin';

        const coinInner = document.createElement('div');
        coinInner.className = 'coin-inner';

        const frontFace = document.createElement('div');
        frontFace.className = 'coin-face coin-front';
        frontFace.textContent = '阳';

        const backFace = document.createElement('div');
        backFace.className = 'coin-face coin-back';
        backFace.textContent = '阴';

        coinInner.appendChild(frontFace);
        coinInner.appendChild(backFace);
        coinContainer.appendChild(coinInner);

        return coinContainer;
    }

    // 解释铜钱结果
    function interpretCoinResult(sum) {
        const interpretations = {
            6: { type: 'yin', changing: true, name: '老阴' },
            7: { type: 'yang', changing: false, name: '少阳' },
            8: { type: 'yin', changing: false, name: '少阴' },
            9: { type: 'yang', changing: true, name: '老阳' }
        };

        return interpretations[sum] || interpretations[7];
    }

    // 显示铜钱结果
    function displayCoinResult(coinResults, lineInfo) {
        if (!coinsResult) return;

        const resultText = `${coinResults.join(' + ')} = ${coinResults.reduce((a, b) => a + b, 0)} (${lineInfo.name})`;
        coinsResult.textContent = resultText;

        // 添加颜色指示
        coinsResult.className = `coins-result ${lineInfo.changing ? 'changing' : 'stable'}`;
    }

    // 渲染卦象
    function renderHexagram(customLines = null) {
        if (!hexagramContainer) return;

        const currentLines = customLines || lines;
        hexagramContainer.innerHTML = '';

        if (currentLines.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'hexagram-placeholder';
            placeholder.innerHTML = '<div class="placeholder-text">请开始投掷铜钱形成卦象</div>';
            hexagramContainer.appendChild(placeholder);
            return;
        }

        const fragment = document.createDocumentFragment();
        currentLines.forEach((lineObj, index) => {
            const lineDiv = createLineElement(lineObj, index, currentLines.length);
            fragment.appendChild(lineDiv);
        });

        hexagramContainer.appendChild(fragment);
    }

    // 创建爻线元素
    function createLineElement(lineObj, index, totalLines) {
        const lineDiv = document.createElement('div');
        lineDiv.classList.add('line', lineObj.type);

        if (lineObj.changing) {
            lineDiv.classList.add('changing');
        }

        // 检查当位
        const lineBitIndex = 5 - index;
        const positionBit = positionCode.charAt(lineBitIndex);
        const lineBit = lineObj.type === 'yang' ? '1' : '0';

        if (lineBit !== positionBit) {
            lineDiv.classList.add('not-position');
        }

        // 新添加的爻线动画
        if (index === totalLines - 1) {
            lineDiv.classList.add('new-line');
        }

        // 创建线段
        if (lineObj.type === 'yang') {
            const segment = document.createElement('div');
            segment.classList.add('segment');
            lineDiv.appendChild(segment);
        } else {
            const segmentLeft = document.createElement('div');
            segmentLeft.classList.add('segment', 'left');

            const gap = document.createElement('div');
            gap.classList.add('middle-gap');

            const segmentRight = document.createElement('div');
            segmentRight.classList.add('segment', 'right');

            lineDiv.appendChild(segmentLeft);
            lineDiv.appendChild(gap);
            lineDiv.appendChild(segmentRight);
        }

        return lineDiv;
    }

    // 处理占卜完成
    function handleDivinationComplete() {
        throwCoinBtn.disabled = true;
        changeHexagramBtn.disabled = false;
        saveBtn.disabled = false;

        updateStep(3);

        // 显示完成通知
        const changingCount = lines.filter(line => line.changing).length;
        const message = changingCount > 0
            ? `占卜完成！发现${changingCount}个变爻，建议查看变卦。`
            : '占卜完成！未发现变爻，当前卦象稳定。';

        YizhiApp.getModule('notification')?.show('success', '占卜完成', message);
    }

    // 更新卦象显示
    function updateHexagramDisplay(customLines = null) {
        if (!YizhiApp.getModule('hexagramData')?.isInitialized) {
            return;
        }

        const currentLines = customLines || lines;

        if (currentLines.length !== 6) {
            resetDisplays();
            return;
        }

        try {
            const binary = generateBinaryFromLines(currentLines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (hexagram) {
                updateHexagramInfo(hexagram);
                updateTrigramInfo(hexagram);
                updateContentTabs(hexagram);
                updateRelatedHexagrams(hexagram.id);
                saveBtn.disabled = false;
            } else {
                showHexagramNotFound();
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Update Hexagram Display');
        }
    }

    // 从爻线生成二进制
    function generateBinaryFromLines(currentLines) {
        let binary = '';
        for (let i = 5; i >= 0; i--) {
            binary += currentLines[i].type === 'yang' ? '1' : '0';
        }
        return binary;
    }

    // 更新卦象基本信息
    function updateHexagramInfo(hexagram) {
        if (hexagramNameDisplay) {
            hexagramNameDisplay.textContent = hexagram.name;
        }
        if (hexagramUnicodeDisplay) {
            hexagramUnicodeDisplay.textContent = hexagram.unicode;
        }
        if (hexagramExplanationDisplay) {
            hexagramExplanationDisplay.textContent = hexagram.explanation || '';
        }
    }

    // 更新上下卦信息
    function updateTrigramInfo(hexagram) {
        if (!upperTrigramInfo || !lowerTrigramInfo) return;

        if (hexagram.upperTrigram && hexagram.lowerTrigram) {
            const upperBagua = YizhiApp.getModule('hexagramData').getBagua(hexagram.upperTrigram);
            const lowerBagua = YizhiApp.getModule('hexagramData').getBagua(hexagram.lowerTrigram);

            upperTrigramInfo.textContent = upperBagua
                ? `上卦: ${hexagram.upperTrigram} ${upperBagua.symbol} (${upperBagua.nature})`
                : '';

            lowerTrigramInfo.textContent = lowerBagua
                ? `下卦: ${hexagram.lowerTrigram} ${lowerBagua.symbol} (${lowerBagua.nature})`
                : '';
        } else {
            upperTrigramInfo.textContent = '';
            lowerTrigramInfo.textContent = '';
        }
    }

    // 更新内容标签页
    function updateContentTabs(hexagram) {
        updateContent(overviewContent, hexagram.overview || '暂无数据');
        updateContent(detailContent, hexagram.detail || '暂无数据');
        updateLinesContent(hexagram);
    }

    // 更新内容
    function updateContent(element, content) {
        if (element) {
            element.innerHTML = `<div class="content-text">${content}</div>`;
        }
    }

    // 更新爻辞内容
    function updateLinesContent(hexagram) {
        if (!linesContent) return;

        linesContent.innerHTML = '';

        if (hexagram.lines && hexagram.lines.length > 0) {
            hexagram.lines.forEach(line => {
                const lineDetail = createLineDetail(line);
                linesContent.appendChild(lineDetail);
            });
        } else {
            linesContent.innerHTML = '<div class="empty-state"><p>暂无爻辞数据</p></div>';
        }
    }

    // 创建爻辞详情元素
    function createLineDetail(line) {
        const lineDetail = document.createElement('div');
        lineDetail.className = 'line-reading';

        const position = line.position || 0;
        const content = line.content || '暂无爻辞';

        lineDetail.innerHTML = `
            <div class="line-position">第${position}爻</div>
            <p class="line-content">${content}</p>
        `;

        if (lines[position - 1]?.changing) {
            lineDetail.classList.add('changing-line-highlight');
        }

        return lineDetail;
    }

    // 更新相关卦象
    function updateRelatedHexagrams(hexagramId) {
        if (!relationsContent) return;

        relationsContent.innerHTML = '';

        const related = YizhiApp.getModule('hexagramData').getRelatedHexagrams(hexagramId);

        if (!related || Object.keys(related).length === 0) {
            relationsContent.innerHTML = '<div class="empty-state"><p>暂无相关卦象数据</p></div>';
            return;
        }

        const relationTypes = {
            opposite: '对宫卦',
            inverse: '综卦',
            mutual: '互卦'
        };

        for (const [type, hexagram] of Object.entries(related)) {
            if (!hexagram) continue;

            const relationItem = createRelationItem(hexagram, relationTypes[type] || type);
            relationsContent.appendChild(relationItem);
        }
    }

    // 创建关系项元素
    function createRelationItem(hexagram, typeName) {
        const relationItem = document.createElement('div');
        relationItem.className = 'relation-item';
        relationItem.innerHTML = `
            <div class="relation-symbol">${hexagram.unicode || ''}</div>
            <div class="relation-info">
                <div class="relation-name">${hexagram.name || '未知卦象'}</div>
                <div class="relation-type">${typeName}</div>
            </div>
        `;

        relationItem.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        return relationItem;
    }

    // 重置显示
    function resetDisplays() {
        if (hexagramNameDisplay) hexagramNameDisplay.textContent = '待演算';
        if (hexagramUnicodeDisplay) hexagramUnicodeDisplay.textContent = '';
        if (hexagramExplanationDisplay) hexagramExplanationDisplay.textContent = '';
        if (upperTrigramInfo) upperTrigramInfo.textContent = '';
        if (lowerTrigramInfo) lowerTrigramInfo.textContent = '';

        const emptyState = '<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7"></path></svg><p>请完成卦象演算以查看详细解读</p></div>';

        if (overviewContent) overviewContent.innerHTML = emptyState;
        if (detailContent) detailContent.innerHTML = emptyState;
        if (linesContent) linesContent.innerHTML = emptyState;
        if (relationsContent) relationsContent.innerHTML = emptyState;
    }

    // 显示卦象未找到
    function showHexagramNotFound() {
        if (hexagramNameDisplay) hexagramNameDisplay.textContent = '未找到对应卦名';
        if (hexagramUnicodeDisplay) hexagramUnicodeDisplay.textContent = '';
        if (hexagramExplanationDisplay) hexagramExplanationDisplay.textContent = '';
        resetDisplays();
    }

    // 变卦显示
    function toggleChangingLines() {
        if (lines.length !== 6) return;

        try {
            if (transformed) {
                renderHexagram();
                updateHexagramDisplay();
                changeHexagramBtn.textContent = '变卦显示';
                transformed = false;
            } else {
                const transformedLines = lines.map(line => {
                    if (line.changing) {
                        return {
                            type: line.type === 'yang' ? 'yin' : 'yang',
                            changing: false
                        };
                    }
                    return { ...line };
                });

                renderHexagram(transformedLines);
                updateHexagramDisplay(transformedLines);
                changeHexagramBtn.textContent = '恢复本卦';
                transformed = true;
                updateStep(4);
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Toggle Changing Lines');
        }
    }

    // 处理重置
    async function handleReset() {
        const confirmed = await YizhiApp.confirm.show(
            '确认重置',
            '确定要重新开始占卜吗？当前进度将会丢失。',
            { danger: true, okText: '重新开始' }
        );

        if (confirmed) {
            resetDivination();
            YizhiApp.getModule('notification')?.show('info', '重新起卦',
                '已重置占卜，可以开始新的一次演算。');
        }
    }

    // 重置占卜
    function resetDivination() {
        lines = [];
        transformed = false;
        animationInProgress = false;

        renderHexagram();
        resetDisplays();

        if (coinsDisplay) coinsDisplay.innerHTML = '';
        if (coinsResult) coinsResult.textContent = '';

        // 重置按钮状态
        throwCoinBtn.disabled = false;
        changeHexagramBtn.disabled = true;
        saveBtn.disabled = true;
        changeHexagramBtn.textContent = '变卦显示';

        // 重置进度
        updateProgress(0);
        updateProgressCount();
        updateThrowButtonText();
        updateStep(1);
    }

    // 保存到历史记录
    function saveToHistory() {
        if (lines.length !== 6) return;

        try {
            const binary = generateBinaryFromLines(lines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (!hexagram) return;

            const historyItem = {
                id: YizhiApp.utils.generateId(),
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: hexagram,
                lines: YizhiApp.utils.deepClone(lines),
                notes: '',
                changingLinesCount: lines.filter(line => line.changing).length
            };

            YizhiApp.getModule('history')?.addRecord(historyItem);
            YizhiApp.getModule('notification')?.show('success', '保存成功',
                '占卜结果已保存到历史记录。', 3000);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Save to History');
        }
    }

    // 更新进度条
    function updateProgress(percentage) {
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    // 更新进度计数
    function updateProgressCount() {
        if (progressCount) {
            progressCount.textContent = `${lines.length}/6`;
        }
    }

    // 更新投掷按钮文本
    function updateThrowButtonText() {
        if (throwSubtitle) {
            throwSubtitle.textContent = lines.length < 6 ? `第${lines.length + 1}爻` : '已完成';
        }
    }

    // 更新步骤指引
    function updateStep(step) {
        Object.values(steps).forEach(stepEl => {
            if (stepEl) {
                stepEl.classList.remove('active', 'completed');
            }
        });

        for (let i = 1; i < step; i++) {
            if (steps[`step${i}`]) {
                steps[`step${i}`].classList.add('completed');
            }
        }

        if (steps[`step${step}`]) {
            steps[`step${step}`].classList.add('active');
        }
    }

    return {
        init,
        onActivate,
        renderHexagram,
        updateHexagramDisplay,
        resetDivination
    };
})();

/**
 * 历史记录模块 - 管理占卜历史记录
 */
const HistoryModule = (function() {
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
const HexagramAnalyzerModule = (function() {
    // 私有变量
    const upperBagua = document.getElementById('upperBagua');
    const lowerBagua = document.getElementById('lowerBagua');
    const combinationResult = document.getElementById('combinationResult');
    const quickComboGrid = document.getElementById('quickComboGrid');

    // 常用组合
    const commonCombinations = [
        { upper: '乾', lower: '乾', name: '乾为天' },
        { upper: '坤', lower: '坤', name: '坤为地' },
        { upper: '坎', lower: '坎', name: '坎为水' },
        { upper: '离', lower: '离', name: '离为火' },
        { upper: '震', lower: '震', name: '震为雷' },
        { upper: '巽', lower: '巽', name: '巽为风' },
        { upper: '艮', lower: '艮', name: '艮为山' },
        { upper: '兑', lower: '兑', name: '兑为泽' }
    ];

    // 初始化
    function init() {
        try {
            bindEvents();
            initQuickCombinations();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hexagram Analyzer Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        upperBagua?.addEventListener('change', analyzeCombination);
        lowerBagua?.addEventListener('change', analyzeCombination);
    }

    // 初始化常用组合
    function initQuickCombinations() {
        if (!quickComboGrid) return;

        const fragment = document.createDocumentFragment();
        commonCombinations.forEach(combo => {
            const comboItem = createQuickComboItem(combo);
            fragment.appendChild(comboItem);
        });

        quickComboGrid.appendChild(fragment);
    }

    // 创建快速组合项
    function createQuickComboItem(combo) {
        const item = document.createElement('div');
        item.className = 'quick-combo-item';

        const upperBaguaData = YizhiApp.getModule('hexagramData')?.getBagua(combo.upper);
        const lowerBaguaData = YizhiApp.getModule('hexagramData')?.getBagua(combo.lower);

        item.innerHTML = `
            <div class="combo-symbols">
                <span class="combo-symbol">${upperBaguaData?.symbol || ''}</span>
                <span class="combo-symbol">${lowerBaguaData?.symbol || ''}</span>
            </div>
            <div class="combo-name">${combo.name}</div>
        `;

        item.addEventListener('click', () => {
            if (upperBagua) upperBagua.value = combo.upper;
            if (lowerBagua) lowerBagua.value = combo.lower;
            analyzeCombination();
        });

        return item;
    }

    // 激活时的操作
    function onActivate() {
        // 重新分析当前组合
        analyzeCombination();
    }

    // 分析卦象组合
    function analyzeCombination() {
        if (!combinationResult) return;

        try {
            const upper = upperBagua?.value;
            const lower = lowerBagua?.value;

            if (!upper || !lower) {
                showEmptyResult();
                return;
            }

            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                showLoadingResult();
                return;
            }

            const hexagram = hexagramDataService.getHexagramByTrigrams(upper, lower);

            if (hexagram) {
                showCombinationResult(upper, lower, hexagram);
            } else {
                showNotFoundResult();
            }
        } catch (error) {
            YizhiApp.errors.handle(error, 'Analyze Combination');
            showErrorResult();
        }
    }

    // 显示空结果
    function showEmptyResult() {
        combinationResult.innerHTML = `
            <div class="result-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"></path>
                </svg>
                <p>选择上下卦以查看组合结果</p>
            </div>
        `;
    }

    // 显示加载结果
    function showLoadingResult() {
        combinationResult.innerHTML = `
            <div class="result-loading">
                <div class="loading-spinner">
                    <div class="taiji-spinner"></div>
                </div>
                <p>正在加载卦象数据...</p>
            </div>
        `;
    }

    // 显示组合结果
    function showCombinationResult(upper, lower, hexagram) {
        const upperBaguaData = YizhiApp.getModule('hexagramData').getBagua(upper);
        const lowerBaguaData = YizhiApp.getModule('hexagramData').getBagua(lower);

        if (!upperBaguaData || !lowerBaguaData) {
            showErrorResult();
            return;
        }

        combinationResult.innerHTML = `
            <div class="combination-formula">
                <div class="formula-part">
                    <div class="combination-symbol">${upperBaguaData.symbol}</div>
                    <div class="symbol-label">${upper}</div>
                </div>
                <span class="operator">+</span>
                <div class="formula-part">
                    <div class="combination-symbol">${lowerBaguaData.symbol}</div>
                    <div class="symbol-label">${lower}</div>
                </div>
                <span class="equals">=</span>
                <div class="result-hexagram">
                    <div class="combination-symbol result-unicode">${hexagram.unicode || ''}</div>
                    <div class="result-info">
                        <div class="result-name">${hexagram.name}</div>
                        <div class="result-explanation">${hexagram.explanation || ''}</div>
                    </div>
                </div>
            </div>
            <div class="combination-details">
                <p class="combination-overview">${hexagram.overview || '暂无详细描述'}</p>
                <button class="btn btn-outline btn-sm view-details-btn">查看详情</button>
            </div>
        `;

        // 添加查看详情按钮事件
        const viewDetailsBtn = combinationResult.querySelector('.view-details-btn');
        viewDetailsBtn?.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });

        // 添加点击整个结果区域查看详情
        const resultHexagram = combinationResult.querySelector('.result-hexagram');
        resultHexagram?.addEventListener('click', () => {
            YizhiApp.getModule('modal')?.show(hexagram);
        });
    }

    // 显示未找到结果
    function showNotFoundResult() {
        combinationResult.innerHTML = `
            <div class="result-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <p>未找到对应的卦象组合</p>
            </div>
        `;
    }

    // 显示错误结果
    function showErrorResult() {
        combinationResult.innerHTML = `
            <div class="result-error">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"></path>
                </svg>
                <p>卦象数据加载失败，请稍后重试</p>
            </div>
        `;
    }

    return {
        init,
        onActivate
    };
})();

/**
 * 知识模块 - 管理八卦知识展示
 */
const KnowledgeModule = (function() {
    // 私有变量
    const baguaGrid = document.getElementById('baguaGrid');
    const featuredHexagrams = document.getElementById('featuredHexagrams');

    // 精选卦象（用于展示）
    const featuredHexagramIds = [1, 2, 11, 12, 63, 64]; // 乾、坤、泰、否、既济、未济

    // 初始化
    function init() {
        try {
            initBaguaKnowledge();

            // 监听卦象数据准备完成事件
            YizhiApp.events.on('hexagram-data:ready', () => {
                initFeaturedHexagrams();
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Knowledge Module Init');
        }
    }

    // 激活时的操作
    function onActivate() {
        // 可以添加激活时的特殊逻辑
    }

    // 初始化八卦知识
    function initBaguaKnowledge() {
        if (!baguaGrid) return;

        try {
            // 等待卦象数据准备就绪
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) {
                // 如果数据还没准备好，稍后再试
                setTimeout(() => initBaguaKnowledge(), 100);
                return;
            }

            const baguaData = hexagramDataService.getBaguaData();
            const fragment = document.createDocumentFragment();

            for (const [name, data] of Object.entries(baguaData)) {
                const baguaCard = createBaguaCard(name, data);
                fragment.appendChild(baguaCard);
            }

            baguaGrid.innerHTML = '';
            baguaGrid.appendChild(fragment);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Init Bagua Knowledge');
        }
    }

    // 创建八卦卡片
    function createBaguaCard(name, data) {
        const baguaCard = document.createElement('div');
        baguaCard.className = 'bagua-card';

        let propertiesHTML = '';
        const propertyLabels = {
            'nature': '本性',
            'attribute': '特质',
            'direction': '方位',
            'animal': '动物',
            'element': '五行',
            'family': '家人'
        };

        for (const [key, value] of Object.entries(data)) {
            if (key === 'symbol' || key === 'binary') continue;
            const label = propertyLabels[key] || key;
            propertiesHTML += `
                <div class="bagua-property">
                    <span class="property-label">${label}:</span>
                    <span class="property-value">${value}</span>
                </div>
            `;
        }

        baguaCard.innerHTML = `
            <div class="bagua-content">
                <div class="bagua-header">
                    <div class="bagua-symbol">${data.symbol}</div>
                    <div class="bagua-info">
                        <div class="bagua-name">${name}</div>
                        <div class="bagua-nature">${data.nature}</div>
                    </div>
                </div>
                <div class="bagua-properties">
                    ${propertiesHTML}
                </div>
            </div>
        `;

        // 添加点击事件
        baguaCard.addEventListener('click', () => {
            showBaguaDetails(name, data);
        });

        return baguaCard;
    }

    // 显示八卦详情
    function showBaguaDetails(name, data) {
        const modalContent = {
            name: `${name}卦详解`,
            unicode: data.symbol,
            explanation: `${data.nature} - ${data.attribute}`,
            overview: `${name}卦象征${data.nature}，具有${data.attribute}的特质。在八卦系统中，${name}卦代表${data.family}的位置，五行属${data.element}，方位在${data.direction}，对应的动物是${data.animal}。`,
            detail: `
                <div class="bagua-detailed">
                    <h4>卦象结构</h4>
                    <p>二进制：${data.binary}</p>
                    <p>符号：${data.symbol}</p>
                    
                    <h4>象征意义</h4>
                    <p>本性：${data.nature}</p>
                    <p>特质：${data.attribute}</p>
                    
                    <h4>对应关系</h4>
                    <p>方位：${data.direction}</p>
                    <p>五行：${data.element}</p>
                    <p>动物：${data.animal}</p>
                    <p>家人：${data.family}</p>
                </div>
            `
        };

        YizhiApp.getModule('modal')?.show(modalContent);
    }

    // 初始化精选卦象
    function initFeaturedHexagrams() {
        if (!featuredHexagrams) return;

        try {
            const hexagramDataService = YizhiApp.getModule('hexagramData');
            if (!hexagramDataService?.isInitialized) return;

            const fragment = document.createDocumentFragment();

            featuredHexagramIds.forEach(id => {
                const hexagram = hexagramDataService.getHexagramById(id);
                if (hexagram) {
                    const featuredItem = createFeaturedItem(hexagram);
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
    function createFeaturedItem(hexagram) {
        const item = document.createElement('div');
        item.className = 'featured-item';

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
        onActivate
    };
})();

/**
 * 搜索模块 - 管理卦象搜索功能
 */
const SearchModule = (function() {
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
const ModalModule = (function() {
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
const HelpModule = (function() {
    // 私有变量
    const helpButton = document.getElementById('helpButton');

    // 帮助内容
    const helpContent = {
        title: '易之使用指南',
        sections: [
            {
                title: '基本操作',
                icon: '🎯',
                items: [
                    '点击"投掷铜钱"按钮，依次形成六爻',
                    '完成六爻后，可以点击"变卦显示"查看变卦',
                    '点击"重新起卦"可以清空当前卦象，重新开始',
                    '点击"保存结果"将当前卦象保存到历史记录中',
                ]
            },
            {
                title: '卦象解读',
                icon: '📖',
                items: [
                    '卦象形成后，可以查看详细解读',
                    '爻辞解读标签页显示各爻的含义',
                    '变爻特别重要，解读时需重点关注',
                    '相关卦象可以帮助理解当前卦象的关联意义',
                    '点击卦象符号可以查看更详细的信息'
                ]
            },
            {
                title: '其他功能',
                icon: '⚙️',
                items: [
                    '历史记录中可以查看过去的占卜结果',
                    '卦象分析工具可以模拟不同八卦的组合',
                    '八卦知识页面提供易经基础理论',
                    '卦象查询功能可以直接搜索特定卦象'
                ]
            },
            {
                title: '占卜原理',
                icon: '🔮',
                items: [
                    '使用三枚铜钱投掷，正面为阳(3)，反面为阴(2)',
                    '三枚铜钱的组合决定每一爻：6为老阴(变阳)，7为少阳，8为少阴，9为老阳(变阴)',
                    '老阴和老阳为变爻，代表能量转化',
                    '本卦显示当前状态，变卦指示发展趋势',
                    '解卦时要综合考虑卦象、爻辞和变化'
                ]
            }
        ]
    };

    // 初始化
    function init() {
        try {
            bindEvents();
        } catch (error) {
            YizhiApp.errors.handle(error, 'Help Module Init');
        }
    }

    // 绑定事件
    function bindEvents() {
        helpButton?.addEventListener('click', showHelp);
        helpButton?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showHelp();
            }
        });
    }

    // 显示帮助
    function showHelp() {
        try {
            // 创建帮助内容HTML
            let sectionsHTML = '';

            helpContent.sections.forEach(section => {
                let itemsHTML = '';
                section.items.forEach(item => {
                    itemsHTML += `<li class="help-item">${item}</li>`;
                });

                sectionsHTML += `
                    <div class="help-section">
                        <h4 class="help-section-title">
                            <span class="help-section-icon">${section.icon}</span>
                            ${section.title}
                        </h4>
                        <ul class="help-item-list">${itemsHTML}</ul>
                    </div>
                `;
            });

            // 创建完整的帮助内容
            const fullContent = `
                <div class="help-content">
                    <div class="help-intro">
                        <h3 class="help-title">${helpContent.title}</h3>
                        <p class="help-description">
                            易之是一个现代化的易经演算系统，融合传统智慧与现代技术，
                            为您提供准确、便捷的占卜体验。以下是详细的使用指南。
                        </p>
                    </div>

                    <div class="help-sections">
                        ${sectionsHTML}
                    </div>
                    
                    <div class="help-footer">
                        <p class="help-version">版本：${YizhiApp.config.version}</p>
                        <p class="help-contact">
                            如有问题或建议，欢迎联系我们。
                        </p>
                    </div>
                </div>
            `;

            // 使用模态框显示帮助内容
            const modalContent = {
                name: '使用指南',
                unicode: '?',
                explanation: '易之 V7.0.0 使用帮助',
                overview: '',
                detail: fullContent
            };

            YizhiApp.getModule('modal')?.show(modalContent);

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Help');
        }
    }

    // 显示快速提示
    function showQuickTip(message, duration = 3000) {
        try {
            YizhiApp.getModule('notification')?.show('info', '使用提示', message, duration);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Quick Tip');
        }
    }

    // 显示功能介绍
    function showFeatureIntro(feature) {
        try {
            const introMessages = {
                divination: '在这里可以进行传统的三钱占卜，通过投掷铜钱形成卦象，获得人生指导。',
                analyzer: '卦象分析工具让您可以自由组合八卦，探索不同卦象的含义和关系。',
                history: '历史记录保存您的所有占卜结果，方便回顾和分析人生轨迹。',
                knowledge: '八卦知识库提供丰富的易经理论知识，帮助您更好地理解卦象。',
                search: '卦象查询功能让您可以快速搜索特定卦象，获取详细信息。'
            };

            const message = introMessages[feature] || '这是一个强大的功能模块。';
            showQuickTip(message, 5000);
        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Feature Intro');
        }
    }

    return {
        init,
        showHelp,
        showQuickTip,
        showFeatureIntro
    };
})();