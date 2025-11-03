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

export async function getWeather(city?: string, lat?: number, lon?: number): Promise<WeatherContext | null> {
	try {
		// Prefer city name if available, fallback to coordinates
		let url = '';
		if (city) {
			// Use OpenWeatherMap city search (free tier allows city name)
			const apiKey = process.env.OPENWEATHER_API_KEY || '';
			if (apiKey) {
				url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
			}
		}
		// Fallback to coordinates if city lookup not available
		if (!url && typeof lat === 'number' && typeof lon === 'number') {
			url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
		}
		if (!url) return null;
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = await res.json();
		// Handle OpenWeatherMap response
		if (data.main?.temp !== undefined) {
			return {
				temperature_c: data.main.temp,
				condition: data.weather?.[0]?.main,
				is_raining: data.weather?.[0]?.main?.toLowerCase().includes('rain') || false,
			};
		}
		// Handle Open-Meteo response
		const cw = data.current_weather;
		if (cw) {
			return {
				temperature_c: cw?.temperature,
				condition: typeof cw?.weathercode !== 'undefined' ? String(cw.weathercode) : undefined,
				is_raining: cw?.weathercode === 61 || cw?.weathercode === 63 || cw?.weathercode === 65,
			};
		}
		return null;
	} catch {
		return null;
	}
}
