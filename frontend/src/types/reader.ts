// Backend serializerlariga aniq mos (apps/reading/serializers.py)

export type SessionStatus = "active" | "closed";

export interface ReadingSession {
  public_id: string;
  book_public_id?: string;
  start_page: number;
  status?: SessionStatus;
  [key: string]: unknown;
}

export interface OpenSessionPayload {
  book_public_id: string;
  book_file_public_id?: string;
  start_page: number;
  start_locator?: string;
  device_type?: "desktop" | "mobile" | "tablet";
}

export interface CloseSessionPayload {
  session_public_id: string;
  end_page?: number;
  end_locator?: string;
}

/** Har 30s'da hisoblanadigan bitta faollik dalili. */
export interface HeartbeatPayload {
  client_seq: number;
  client_ts: string;
  page: number;
  active_seconds: number;
  is_focused: boolean;
  scroll_delta?: number;
  viewport_pct?: number;
}

export interface SendHeartbeatsPayload {
  session_public_id: string;
  heartbeats: HeartbeatPayload[];
}

export interface HeartbeatsResponse {
  accepted: number;
}

export type ReadingStatus = "not_started" | "in_progress" | "completed" | string;

export interface ReadingProgress {
  max_page_reached: number;
  current_page: number;
  percent: number;
  status: ReadingStatus;
  [key: string]: unknown;
}
