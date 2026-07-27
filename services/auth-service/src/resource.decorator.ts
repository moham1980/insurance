import { SetMetadata } from '@nestjs/common';

export const RESOURCE_TYPE_KEY = 'resourceType';
export const RESOURCE_ACTION_KEY = 'resourceAction';

export const Resource = (resourceType: string) => SetMetadata(RESOURCE_TYPE_KEY, resourceType);
export const ResourceAction = (action: string) => SetMetadata(RESOURCE_ACTION_KEY, action);
