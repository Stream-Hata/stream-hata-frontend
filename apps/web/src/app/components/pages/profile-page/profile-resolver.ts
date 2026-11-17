import type { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ProfileDataService } from '@api/profile-data.service';

export const profileResolver: ResolveFn<boolean> = () => inject(ProfileDataService).load();
