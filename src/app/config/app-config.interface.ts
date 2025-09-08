export interface IAppConfig {
  apiUrl: string;
  version: string;
  originSiteUrl: string;  
}

export type Environment = 'development' | 'production' | 'staging';

export interface IConfigFile {
  development: IAppConfig;
  production: IAppConfig;
  staging: IAppConfig;
}