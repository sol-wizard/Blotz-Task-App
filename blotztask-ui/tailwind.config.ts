import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		animation: {
  			'mul-shd-spin': 'mulShdSpin 1.3s linear infinite',
  			'mul-shd-spin-white': 'mulShdSpinWhite 1.3s linear infinite',
  			'typing-dot-bounce': 'typing-dot-bounce 1.25s ease-out infinite'
  		},
  		keyframes: {
  			mulShdSpin: {
  				'0%, 100%': {
  					'box-shadow': '0 -3em 0 0.2em #4380FD, 2em -2em 0 0em rgba(67,128,253, 0.2), 3em 0 0 -1em rgba(67,128,253, 0.2), 2em 2em 0 -1em rgba(67,128,253, 0.2), 0 3em 0 -1em rgba(67,128,253, 0.2), -2em 2em 0 -1em rgba(67,128,253, 0.2), -3em 0 0 -1em rgba(67,128,253, 0.5), -2em -2em 0 0 rgba(67,128,253, 0.7)'
  				},
  				'12.5%': {
  					'box-shadow': '0 -3em 0 0 rgba(67,128,253, 0.7), 2em -2em 0 0.2em #4380FD, 3em 0 0 0 rgba(67,128,253, 0.2), 2em 2em 0 -1em rgba(67,128,253, 0.2), 0 3em 0 -1em rgba(67,128,253, 0.2), -2em 2em 0 -1em rgba(67,128,253, 0.2), -3em 0 0 -1em rgba(67,128,253, 0.2), -2em -2em 0 -1em rgba(67,128,253, 0.5)'
  				},
  				'25%': {
  					'box-shadow': '0 -3em 0 -0.5em rgba(67,128,253, 0.5), 2em -2em 0 0 rgba(67,128,253, 0.7), 3em 0 0 0.2em #4380FD, 2em 2em 0 0 rgba(67,128,253, 0.2), 0 3em 0 -1em rgba(67,128,253, 0.2), -2em 2em 0 -1em rgba(67,128,253, 0.2), -3em 0 0 -1em rgba(67,128,253, 0.2), -2em -2em 0 -1em rgba(67,128,253, 0.2)'
  				},
  				'37.5%': {
  					'box-shadow': '0 -3em 0 -1em rgba(67,128,253, 0.2), 2em -2em 0 -1em rgba(67,128,253, 0.5), 3em 0 0 0 rgba(67,128,253, 0.7), 2em 2em 0 0.2em #4380FD, 0 3em 0 0em rgba(67,128,253, 0.2), -2em 2em 0 -1em rgba(67,128,253, 0.2), -3em 0 0 -1em rgba(67,128,253, 0.2), -2em -2em 0 -1em rgba(67,128,253, 0.2)'
  				},
  				'50%': {
  					'box-shadow': '0 -3em 0 -1em rgba(67,128,253, 0.2), 2em -2em 0 -1em rgba(67,128,253, 0.2), 3em 0 0 -1em rgba(67,128,253, 0.5), 2em 2em 0 0em rgba(67,128,253, 0.7), 0 3em 0 0.2em #4380FD, -2em 2em 0 0 rgba(67,128,253, 0.2), -3em 0 0 -1em rgba(67,128,253, 0.2), -2em -2em 0 -1em rgba(67,128,253, 0.2)'
  				},
  				'62.5%': {
  					'box-shadow': '0 -3em 0 -1em rgba(67,128,253, 0.2), 2em -2em 0 -1em rgba(67,128,253, 0.2), 3em 0 0 -1em rgba(67,128,253, 0.2), 2em 2em 0 -1em rgba(67,128,253, 0.5), 0 3em 0 0 rgba(67,128,253, 0.7), -2em 2em 0 0.2em #4380FD, -3em 0 0 0 rgba(67,128,253, 0.2), -2em -2em 0 -1em rgba(67,128,253, 0.2)'
  				},
  				'75%': {
  					'box-shadow': '0em -3em 0 -1em rgba(67,128,253, 0.2), 2em -2em 0 -1em rgba(67,128,253, 0.2), 3em 0 0 -1em rgba(67,128,253, 0.2), 2em 2em 0 -1em rgba(67,128,253, 0.2), 0 3em 0 -1em rgba(67,128,253, 0.5), -2em 2em 0 0 rgba(67,128,253, 0.7), -3em 0 0 0.2em #4380FD, -2em -2em 0 0 rgba(67,128,253, 0.2)'
  				},
  				'87.5%': {
  					'box-shadow': '0em -3em 0 0 rgba(67,128,253, 0.2), 2em -2em 0 -1em rgba(67,128,253, 0.2), 3em 0 0 -1em rgba(67,128,253, 0.2), 2em 2em 0 -1em rgba(67,128,253, 0.2), 0 3em 0 -1em rgba(67,128,253, 0.2), -2em 2em 0 0 rgba(67,128,253, 0.5), -3em 0 0 0 rgba(67,128,253, 0.7), -2em -2em 0 0.2em #4380FD'
  				}
  			},
  			mulShdSpinWhite: {
  				'0%, 100%': {
  					'box-shadow': '0 -3em 0 0.2em, 2em -2em 0 0em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 0'
  				},
  				'12.5%': {
  					'box-shadow': '0 -3em 0 0, 2em -2em 0 0.2em, 3em 0 0 0, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em'
  				},
  				'25%': {
  					'box-shadow': '0 -3em 0 -0.5em, 2em -2em 0 0, 3em 0 0 0.2em, 2em 2em 0 0, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em'
  				},
  				'37.5%': {
  					'box-shadow': '0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 0, 2em 2em 0 0.2em, 0 3em 0 0, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em'
  				},
  				'50%': {
  					'box-shadow': '0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 0, 0 3em 0 0.2em, -2em 2em 0 0, -3em 0 0 -1em, -2em -2em 0 -1em'
  				},
  				'62.5%': {
  					'box-shadow': '0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 0, -2em 2em 0 0.2em, -3em 0 0 0, -2em -2em 0 -1em'
  				},
  				'75%': {
  					'box-shadow': '0em -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0 0 0.2em, -2em -2em 0 0'
  				},
  				'87.5%': {
  					'box-shadow': '0em -3em 0 0, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0 0 0, -2em -2em 0 0.2em'
  				}
  			},
  			'typing-dot-bounce': {
  				'0%,40%': {
  					transform: 'translateY(0)'
  				},
  				'20%': {
  					transform: 'translateY(-0.25rem)'
  				}
  			}
  		},
  		fontFamily: {
  			satoshi: [
  				'Satoshi',
  				'sans-serif'
  			],
  			inter: [
  				'Inter',
  				'sans-serif'
  			],
  			display: 'fantasy'
  		},
  		colors: {
  			primary: '#4380FD',
  			'primary-dark': '#2C3233',
  			'default-text': 'var(--color-text)',
  			secondary: '#278291',
  			warn: '#F42F67',
  			'monthly-stats-personal-label': '#fffcc4',
  			'monthly-stats-acadedmic-label': '#a0e4e4',
  			'monthly-stats-others-label': '#98bcfc',
  			'monthly-stats-work-label': '#d0b4fc',
  			completed: '#9BE3E1',
  			unfinished: '#FF94B3',
  			'unfinished-header': '#DC567C',
  			'add-task-title-bg': '#278291',
  			'add-task-title-text': '#FFFFFF',
  			'add-task-title-placeholder': '#FFFFFF',
  			'add-task-work-label-bg': '#CDB2FF',
  			'add-task-work-label-text': '#6021D6',
  			'add-task-personal-label-bg': '#FBFAC2',
  			'add-task-personal-label-text': '#7E7C1D',
  			'add-task-academic-label-bg': '#278291',
  			'add-task-academic-label-text': '#FFFFFF',
  			'add-task-others-label-bg': '#94BDFF',
  			'add-task-others-label-text': '#1458C6',
  			'add-task-work-input-area-bg': '#E8E1F5',
  			'add-task-personal-input-area-bg': '#F4F4E3',
  			'add-task-academic-input-area-bg': '#9BE3E1',
  			'add-task-others-input-area-bg': '#D2E3FF',
  			'all-task-add-button-bg': '#F4F4F4',
  			'all-task-add-button-text': '#2C3233',
  			'all-task-add-button-border': '#2C3233',
  			'all-task-delete-button-bg': '#2C3233',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: '#EFF3FF',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			shiki: {
  				light: 'var(--shiki-light)',
  				'light-bg': 'var(--shiki-light-bg)',
  				dark: 'var(--shiki-dark)',
  				'dark-bg': 'var(--shiki-dark-bg)'
  			},
			userMessageBox: {
				DEFAULT: '#4380FD4D'
			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
