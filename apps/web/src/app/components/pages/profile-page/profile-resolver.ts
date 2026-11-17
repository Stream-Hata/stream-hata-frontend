import type { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ProfileDataService } from '@shared/services/profile-data.service';

export const profileResolver: ResolveFn<boolean> = () => inject(ProfileDataService).load();
