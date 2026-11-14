import type { UmkmRecord } from './dataset.ts';
import { simulatePostAnalysisLocation } from './api-simulator.ts';

export type VisitorSidebarState = 'LIST' | 'DETAIL' | 'ROUTE' | 'EMPTY';

export interface VisitorMapState {
    sidebarState: VisitorSidebarState;
    selectedUmkm: UmkmRecord | null;
    activeCategory: string | null;
    searchQuery: string;
    radiusMeters: number;
    sortOption: 'rating' | 'jarak' | 'rekomendasi';
    isFilterPanelOpen: boolean;
    isStatisticsDrawerOpen: boolean;
    isLayerControlOpen: boolean;
    activeLayers: {
        wilayah: boolean;
        sekolah: boolean;
        jalan: boolean;
        permukiman: boolean;
    };
    routing: {
        isActive: boolean;
        mode: 'motor' | 'mobil' | 'jalan_kaki';
        durationMinutes: number;
        distanceMeters: number;
    } | null;
}

export function createVisitorMapState(): VisitorMapState {
    return {
        sidebarState: 'LIST',
        selectedUmkm: null,
        activeCategory: null,
        searchQuery: '',
        radiusMeters: 5000,
        sortOption: 'rekomendasi',
        isFilterPanelOpen: false,
        isStatisticsDrawerOpen: false,
        isLayerControlOpen: false,
        activeLayers: {
            wilayah: true,
            sekolah: false,
            jalan: false,
            permukiman: false,
        },
        routing: null,
    };
}

export class VisitorMapController {
    private state: VisitorMapState;

    constructor() {
        this.state = createVisitorMapState();
    }

    getState(): Readonly<VisitorMapState> {
        return { ...this.state };
    }

    // Toggleable panel interactions (Google Maps style)
    toggleFilterPanel(): boolean {
        this.state.isFilterPanelOpen = !this.state.isFilterPanelOpen;
        return this.state.isFilterPanelOpen;
    }

    toggleStatisticsDrawer(): boolean {
        this.state.isStatisticsDrawerOpen = !this.state.isStatisticsDrawerOpen;
        return this.state.isStatisticsDrawerOpen;
    }

    toggleLayerControl(): boolean {
        this.state.isLayerControlOpen = !this.state.isLayerControlOpen;
        return this.state.isLayerControlOpen;
    }

    toggleLayer(layer: 'wilayah' | 'sekolah' | 'jalan' | 'permukiman'): boolean {
        this.state.activeLayers[layer] = !this.state.activeLayers[layer];
        return this.state.activeLayers[layer];
    }

    selectCategory(cat: string | null) {
        this.state.activeCategory = this.state.activeCategory === cat ? null : cat;
    }

    setSearchQuery(q: string, resultsCount: number) {
        this.state.searchQuery = q;
        if (resultsCount === 0 && q.trim().length > 0) {
            this.state.sidebarState = 'EMPTY';
        } else {
            this.state.sidebarState = 'LIST';
        }
    }

    clearSearch() {
        this.state.searchQuery = '';
        this.state.sidebarState = 'LIST';
    }

    openUmkmDetail(umkm: UmkmRecord) {
        this.state.selectedUmkm = umkm;
        this.state.sidebarState = 'DETAIL';
    }

    closeDetail() {
        this.state.selectedUmkm = null;
        this.state.sidebarState = 'LIST';
    }

    startRouting(mode: 'motor' | 'mobil' | 'jalan_kaki' = 'motor', distance = 1500, duration = 6.5) {
        this.state.sidebarState = 'ROUTE';
        this.state.routing = {
            isActive: true,
            mode,
            distanceMeters: distance,
            durationMinutes: duration,
        };
    }

    switchRouteMode(mode: 'motor' | 'mobil' | 'jalan_kaki') {
        if (!this.state.routing) return;
        this.state.routing.mode = mode;
        const dist = this.state.routing.distanceMeters;
        if (mode === 'motor') {
            this.state.routing.durationMinutes = Math.round(((dist / 1000) / 35) * 60 * 0.85 * 10) / 10;
        } else if (mode === 'mobil') {
            this.state.routing.durationMinutes = Math.round(((dist / 1000) / 25) * 60 * 10) / 10;
        } else if (mode === 'jalan_kaki') {
            this.state.routing.durationMinutes = Math.round((dist / (1.25 * 60)) * 10) / 10;
        }
    }

    closeRouting() {
        this.state.routing = null;
        this.state.sidebarState = this.state.selectedUmkm ? 'DETAIL' : 'LIST';
    }

    setRadius(meters: number) {
        this.state.radiusMeters = Math.max(250, Math.min(5000, meters));
    }
}

export interface EntrepreneurMapState {
    currentStep: 1 | 2 | 3;
    selectedCategory: string | null;
    candidatePoint: { lat: number; lng: number } | null;
    radiusMeters: number;
    guardrailWarning: string | null;
    analysisResult: {
        totalAllUmkm: number;
        competitorsCount: number;
        nearestRoadDistance: number;
        nearestSchoolDistance: number;
        disclaimer: string;
    } | null;
}

export class EntrepreneurMapController {
    private state: EntrepreneurMapState;

    constructor() {
        this.state = {
            currentStep: 1,
            selectedCategory: null,
            candidatePoint: null,
            radiusMeters: 500,
            guardrailWarning: null,
            analysisResult: null,
        };
    }

    getState(): Readonly<EntrepreneurMapState> {
        return { ...this.state };
    }

    // Step 1: Select Category
    selectCategory(kategori: string): boolean {
        this.state.selectedCategory = kategori;
        this.state.currentStep = 2;
        this.state.guardrailWarning = null;

        // If candidate point and radius already existed (dynamic re-analysis)
        if (this.state.candidatePoint) {
            this.runAnalysis();
        }
        return true;
    }

    // Step 2: Pick Candidate Coordinate
    setCandidatePoint(lat: number, lng: number): { success: boolean; message?: string } {
        if (!this.state.selectedCategory) {
            this.state.guardrailWarning = 'Pilih Dulu Kategori UMKM-Mu';
            return { success: false, message: this.state.guardrailWarning };
        }

        this.state.candidatePoint = { lat, lng };
        this.state.currentStep = 3;
        this.state.guardrailWarning = null;
        this.runAnalysis();
        return { success: true };
    }

    // Step 3: Adjust Radius Buffer
    setRadius(meters: number): { success: boolean; message?: string } {
        if (!this.state.selectedCategory) {
            this.state.guardrailWarning = 'Pilih Dulu Kategori UMKM-Mu';
            return { success: false, message: this.state.guardrailWarning };
        }
        if (!this.state.candidatePoint) {
            this.state.guardrailWarning = 'Pilih Titik Lokasi UMKM-Mu Dulu';
            return { success: false, message: this.state.guardrailWarning };
        }

        this.state.radiusMeters = meters;
        this.state.guardrailWarning = null;
        this.runAnalysis();
        return { success: true };
    }

    private runAnalysis() {
        if (!this.state.candidatePoint || !this.state.selectedCategory) return;
        const res = simulatePostAnalysisLocation({
            latitude: this.state.candidatePoint.lat,
            longitude: this.state.candidatePoint.lng,
            radius: this.state.radiusMeters,
            kategori: this.state.selectedCategory,
        });

        if (res.status === 200 && res.data && typeof res.data === 'object') {
            const d = (res.data as Record<string, unknown>).data as Record<string, unknown>;
            const ringkasan = d.ringkasan as Record<string, number>;
            this.state.analysisResult = {
                totalAllUmkm: ringkasan.total_umkm_dalam_radius,
                competitorsCount: ringkasan.total_kompetitor_sejenis,
                nearestRoadDistance: ringkasan.jarak_jalan_terdekat_meter,
                nearestSchoolDistance: ringkasan.jarak_sekolah_terdekat_meter,
                disclaimer: d.catatan_kelayakan as string,
            };
        }
    }
}
