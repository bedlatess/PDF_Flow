/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class', // 支持暗黑模式
  theme: {
    extend: {
      colors: {
        // 品牌主色 - Indigo 靛蓝
        primary: {
          DEFAULT: '#4F46E5',
          50: '#ECEEFB',
          100: '#D9DDF7',
          200: '#B3BAEF',
          300: '#8C98E7',
          400: '#6675DF',
          500: '#4F46E5', // 主色
          600: '#3F38B6',
          700: '#2F2A88',
          800: '#201B5A',
          900: '#100D2D',
        },
        // 功能色
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        // 背景层级
        background: {
          light: '#F8FAFC',
          dark: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Noto Sans SC', 'sans-serif'],
      },
      spacing: {
        // 4pt/8pt 栅格系统
        0.5: '0.125rem', // 2px
        1: '0.25rem', // 4px
        2: '0.5rem', // 8px
        3: '0.75rem', // 12px
        4: '1rem', // 16px
        5: '1.25rem', // 20px
        6: '1.5rem', // 24px
        8: '2rem', // 32px
        10: '2.5rem', // 40px
        12: '3rem', // 48px
        16: '4rem', // 64px
      },
      borderRadius: {
        DEFAULT: '0.5rem', // 8px
        sm: '0.25rem', // 4px
        md: '0.5rem', // 8px
        lg: '0.75rem', // 12px
        xl: '1rem', // 16px
        '2xl': '1.5rem', // 24px
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      },
      backdropBlur: {
        glass: '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      screens: {
        // 响应式断点（文档规范）
        sm: '640px', // 移动端单列
        md: '768px', // 平板双列
        lg: '1024px', // 桌面端标准
        xl: '1280px', // 大屏
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
