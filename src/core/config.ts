import Conf from 'conf';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const SCHEMA_VERSION = '1.0.0';

interface GlobalConfig {
    accessToken?: string;
    userId?: string;
    email?: string;
    serverUrl: string;
}

interface LocalConfig {
    projectId?: string;
    organizationId?: string;
    environment?: string;
}

const config = new Conf<GlobalConfig>({
    projectName: 'synqra',
    defaults: {
        serverUrl: 'http://localhost:3000',
    }
});

export const auth = {
    setToken: (token: string) => config.set('accessToken', token),
    getToken: () => config.get('accessToken'),
    setUser: (email: string, id: string) => {
        config.set('email', email);
        config.set('userId', id);
    },
    logout: () => {
        config.delete('accessToken');
        config.delete('email');
        config.delete('userId');
    },
    isLoggedIn: () => !!config.get('accessToken'),
    getServerUrl: () => config.get('serverUrl'),
};

const LOCAL_CONFIG_PATH = resolve(process.cwd(), '.synqra', 'project.json');

import { mkdirSync } from 'fs';

export const project = {
    link: (projectId: string, organizationId?: string) => {
        const dir = resolve(process.cwd(), '.synqra');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const data: LocalConfig = { projectId, organizationId };
        writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(data, null, 2));
    },
    getConfig: (): LocalConfig | null => {
        if (!existsSync(LOCAL_CONFIG_PATH)) return null;
        try {
            return JSON.parse(readFileSync(LOCAL_CONFIG_PATH, 'utf-8'));
        } catch (e) {
            return null;
        }
    }
};
