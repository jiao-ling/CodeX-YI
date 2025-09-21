(function(global) {
    const MODULES = {
        theme: {
            path: 'js/modules/theme.js',
            exportName: 'ThemeModule',
            registerAs: 'theme',
            eager: true
        },
        notification: {
            path: 'js/modules/notification.js',
            exportName: 'NotificationModule',
            registerAs: 'notification',
            eager: true
        },
        hexagramData: {
            path: 'js/modules/hexagram-data.js',
            exportName: 'HexagramDataService',
            registerAs: 'hexagramData',
            eager: true
        },
        modal: {
            path: 'js/modules/modal.js',
            exportName: 'ModalModule',
            registerAs: 'modal',
            eager: true,
            dependencies: ['hexagramData', 'notification']
        },
        divination: {
            path: 'js/modules/divination.js',
            exportName: 'DivinationModule',
            registerAs: 'divination',
            eager: true,
            dependencies: ['hexagramData', 'modal', 'notification']
        },
        history: {
            path: 'js/modules/history.js',
            exportName: 'HistoryModule',
            registerAs: 'history',
            dependencies: ['hexagramData', 'notification']
        },
        'hexagram-analyzer': {
            path: 'js/modules/hexagram-analyzer.js',
            exportName: 'HexagramAnalyzerModule',
            registerAs: 'hexagram-analyzer',
            dependencies: ['hexagramData']
        },
        knowledge: {
            path: 'js/modules/knowledge.js',
            exportName: 'KnowledgeModule',
            registerAs: 'knowledge',
            dependencies: ['hexagramData', 'modal']
        },
        search: {
            path: 'js/modules/search.js',
            exportName: 'SearchModule',
            registerAs: 'search',
            dependencies: ['hexagramData', 'modal']
        },
        help: {
            path: 'js/modules/help.js',
            exportName: 'HelpModule',
            registerAs: 'help',
            dependencies: ['modal']
        }
    };

    const SECTION_TO_MODULE = {
        history: 'history',
        'hexagram-analyzer': 'hexagram-analyzer',
        knowledge: 'knowledge',
        search: 'search'
    };

    const loadedModules = new Set();
    const loadingPromises = new Map();

    function loadScript(definition) {
        if (loadingPromises.has(definition.path)) {
            return loadingPromises.get(definition.path);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = definition.path;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`无法加载模块脚本: ${definition.path}`));
            document.head.appendChild(script);
        });

        loadingPromises.set(definition.path, promise);
        return promise;
    }

    async function ensureModule(name) {
        const definition = MODULES[name];
        if (!definition) {
            throw new Error(`未知模块: ${name}`);
        }

        if (loadedModules.has(name)) {
            return global[definition.exportName];
        }

        if (definition.dependencies) {
            for (const dependency of definition.dependencies) {
                await ensureModule(dependency);
            }
        }

        await loadScript(definition);

        const moduleInstance = global[definition.exportName];
        if (!moduleInstance) {
            throw new Error(`模块 ${name} 没有在全局作用域暴露实例`);
        }

        if (global.YizhiApp) {
            global.YizhiApp.registerModule(definition.registerAs, moduleInstance);
        }

        loadedModules.add(name);
        return moduleInstance;
    }

    async function loadInitialModules() {
        const eagerModules = Object.entries(MODULES)
            .filter(([, def]) => def.eager)
            .map(([name]) => name);

        for (const name of eagerModules) {
            await ensureModule(name);
        }
    }

    function setupLazyLoading() {
        const navButtons = document.querySelectorAll('.nav-button[data-section]');
        navButtons.forEach(button => {
            const section = button.getAttribute('data-section');
            const moduleName = SECTION_TO_MODULE[section];
            if (!moduleName) return;

            const loadModule = () => {
                ensureModule(moduleName).catch(error => {
                    console.error(`加载模块 ${moduleName} 时出错`, error);
                    showStartupError(error);
                });
            };

            button.addEventListener('click', loadModule, { once: true });
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    loadModule();
                }
            }, { once: true });
            button.addEventListener('mouseover', () => {
                loadModule();
            }, { once: true });
        });

        const helpButton = document.getElementById('helpButton');
        if (helpButton) {
            const loadHelp = async (event) => {
                if (!loadedModules.has('help')) {
                    event?.preventDefault();
                    await ensureModule('help');
                    global.HelpModule?.showHelp?.();
                }
            };
            helpButton.addEventListener('click', loadHelp, { once: true });
            helpButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    loadHelp(event);
                }
            }, { once: true });
        }

        if ('requestIdleCallback' in global) {
            requestIdleCallback(() => prefetchLazyModules());
        } else {
            setTimeout(() => prefetchLazyModules(), 1500);
        }
    }

    function prefetchLazyModules() {
        Object.entries(MODULES)
            .filter(([, def]) => !def.eager)
            .forEach(([name]) => {
                ensureModule(name).catch(() => {
                    // 忽略预取失败，后续交互时再重试
                });
            });
    }

    async function bootstrap() {
        try {
            await loadInitialModules();
            await global.YizhiApp.init();
            setupLazyLoading();
        } catch (error) {
            console.error('应用启动失败:', error);
            showStartupError(error);
        }
    }

    function showStartupError(error) {
        if (document.getElementById('startupError')) {
            return;
        }

        const errorMessage = document.createElement('div');
        errorMessage.id = 'startupError';
        errorMessage.className = 'startup-error';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h3>系统启动失败</h3>
                <p>${error?.message || '很抱歉，易之系统在加载过程中遇到了问题。'}</p>
                <button class="btn btn-primary">重新加载</button>
            </div>
        `;
        errorMessage.querySelector('button')?.addEventListener('click', () => location.reload());
        document.body.appendChild(errorMessage);
    }

    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });

    global.ModuleLoader = {
        ensure: ensureModule,
        bootstrap
    };
})(window);
