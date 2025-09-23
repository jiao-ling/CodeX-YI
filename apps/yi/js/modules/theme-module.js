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
