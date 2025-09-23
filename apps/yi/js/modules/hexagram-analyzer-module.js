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
