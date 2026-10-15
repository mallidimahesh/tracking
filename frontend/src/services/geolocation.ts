export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export class GeolocationService {
  private watchId: number | null = null;
  private isWatching = false;

  public static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  public startWatching(
    onLocation: (coords: GeoCoordinates) => void,
    onError: (error: string) => void
  ): boolean {
    if (!GeolocationService.isSupported()) {
      onError('Geolocation is not supported by your browser.');
      return false;
    }

    if (this.isWatching) {
      return true;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    };

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.isWatching = true;
          onLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let msg = 'Failed to get GPS location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'GPS location permission denied. Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'GPS signal unavailable. Ensure location services are toggled on.';
              break;
            case error.TIMEOUT:
              msg = 'GPS fix timed out. Waiting for satellite lock...';
              break;
          }
          onError(msg);
        },
        options
      );
      this.isWatching = true;
      return true;
    } catch (err: any) {
      onError(err?.message || 'Error initializing GPS tracking');
      return false;
    }
  }

  public stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  public getIsWatching(): boolean {
    return this.isWatching;
  }
}

export const geolocationService = new GeolocationService();
