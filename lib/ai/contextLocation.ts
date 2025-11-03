import { NextRequest } from 'next/server';

export type LocationContext = {
	city?: string;
	country_name?: string;
	latitude?: number;
	longitude?: number;
	timezone?: string;
};

export type WeatherContext = {
	temperature_c?: number;
	condition?: string;
	is_raining?: boolean;
};

export async function getLocation(req: NextRequest): Promise<LocationContext | null> {
	try {
		const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
		const res = await fetch('https://ipapi.co/json/');
		if (!res.ok) return null;
		const data = await res.json();
		return {
			city: data.city,
			country_name: data.country_name,
			latitude: data.latitude,
			longitude: data.longitude,
			timezone: data.timezone,
		};
	} catch {
		return null;
	}
}

export async function getWeather(lat?: number, lon?: number): Promise<WeatherContext | null> {
	try {
		if (typeof lat !== 'number' || typeof lon !== 'number') return null;
		const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = await res.json();
		const cw = data.current_weather;
		return {
			temperature_c: cw?.temperature,
			condition: typeof cw?.weathercode !== 'undefined' ? String(cw.weathercode) : undefined,
			is_raining: cw?.weathercode === 61 || cw?.weathercode === 63 || cw?.weathercode === 65,
		};
	} catch {
		return null;
	}
}
