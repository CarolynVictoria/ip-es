import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		open: true,
		proxy: {
			'/api': {
				target: 'http://localhost:5505', // ✅ matches PORT
				changeOrigin: true,
				secure: false,
			},
		},
	},
});
