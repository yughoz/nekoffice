import {defineConfig} from 'vite';
import {viewerPlugin} from './server/viewerPlugin.js';
export default defineConfig({plugins:[viewerPlugin()]});
