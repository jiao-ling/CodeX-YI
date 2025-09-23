/**
 * 占卜模块 - 管理铜钱投掷和卦象生成
 */
const DivinationModule = (function() {
    // 私有变量
    const throwCoinBtn = document.getElementById('throwCoinBtn');
    const changeHexagramBtn = document.getElementById('changeHexagramBtn');
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
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
        exportBtn?.addEventListener('click', exportResult);
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
        exportBtn.disabled = false;

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
                exportBtn.disabled = false;
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
        exportBtn.disabled = true;
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

    // 导出结果
    function exportResult() {
        if (lines.length !== 6) return;

        try {
            const binary = generateBinaryFromLines(lines);
            const hexagram = YizhiApp.getModule('hexagramData').getHexagramByBinary(binary);

            if (!hexagram) return;

            const exportData = {
                date: YizhiApp.utils.formatDate(new Date()),
                hexagram: {
                    name: hexagram.name,
                    explanation: hexagram.explanation,
                    overview: hexagram.overview,
                    detail: hexagram.detail
                },
                lines: lines.map((line, index) => ({
                    position: index + 1,
                    type: line.type,
                    changing: line.changing
                })),
                changingLinesCount: lines.filter(line => line.changing).length
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `易之占卜_${hexagram.name}_${YizhiApp.utils.formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`;
            link.click();

            URL.revokeObjectURL(link.href);

            YizhiApp.getModule('notification')?.show('success', '导出成功',
                '占卜结果已导出到本地文件。');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Export Result');
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
