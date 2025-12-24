import React, { createContext, useContext, ReactNode } from 'react';

type ConfigContextType = {
	appName: string;
};

const defaultConfig: ConfigContextType = { appName: 'Alshabandar' };

const ConfigContext = createContext<ConfigContextType>(defaultConfig);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	return <ConfigContext.Provider value={defaultConfig}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => useContext(ConfigContext);

export default ConfigContext;
