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
