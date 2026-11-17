import { HttpClient } from '@angular/common/http';

import { inject, Service } from '@angular/core';
import { map } from 'rxjs';
import { parse } from 'yaml';

export interface YamlPlatform {
	maintainer: string;
	platforms: Platform[];
}

export interface Platform {
	name: string;
	icon: string;
	code: string;
}

@Service({
	autoProvided: true,
})
export class YamlParser {
	private readonly http = inject(HttpClient);

	parse() {
		return this.http
			.get('platforms.yaml', { responseType: 'text' })
			.pipe(map((data) => parse(data) as YamlPlatform[]));
	}
}
