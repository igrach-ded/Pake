mod app;
mod util;

use tauri::Manager;

#[cfg(not(target_os = "android"))]
use tauri_plugin_window_state::Builder as WindowStatePlugin;
#[cfg(not(target_os = "android"))]
use tauri_plugin_window_state::StateFlags;

#[cfg(target_os = "macos")]
use std::time::Duration;

const WINDOW_SHOW_DELAY: u64 = 50;

use app::{
    invoke::{
        clear_cache_and_restart, clear_dock_badge, download_file, download_file_by_binary,
        increment_dock_badge, send_notification, set_dock_badge, set_dock_badge_label,
        update_theme_mode,
    },
    window::{open_additional_window_safe, set_window, MultiWindowState},
};

#[cfg(not(target_os = "android"))]
use app::setup::{set_global_shortcut, set_system_tray};

use util::get_pake_config;

pub fn run_app() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    let (pake_config, tauri_config) = get_pake_config();
    let tauri_app = tauri::Builder::default();

    // Desktop-only configuration variables
    #[cfg(not(target_os = "android"))]
    let show_system_tray = pake_config.show_system_tray();
    #[cfg(not(target_os = "android"))]
    let hide_on_close = pake_config.windows[0].hide_on_close;
    #[cfg(not(target_os = "android"))]
    let activation_shortcut = pake_config.windows[0].activation_shortcut.clone();
    #[cfg(not(target_os = "android"))]
    let init_fullscreen = pake_config.windows[0].fullscreen;
    #[cfg(not(target_os = "android"))]
    let start_to_tray = pake_config.windows[0].start_to_tray && show_system_tray;
    #[cfg(not(target_os = "android"))]
    let multi_instance = pake_config.multi_instance;
    #[cfg(not(target_os = "android"))]
    let multi_window = pake_config.multi_window;
    #[cfg(not(target_os = "android"))]
    let enable_find = pake_config.windows[0].enable_find;

    // Window state plugin is desktop-only
    #[cfg(not(target_os = "android"))]
    let window_state_plugin = WindowStatePlugin::default()
        .with_state_flags(if init_fullscreen {
            StateFlags::FULLSCREEN
        } else {
            StateFlags::all() & !StateFlags::VISIBLE
        })
        .build();

    #[allow(deprecated)]
    #[allow(unused_mut)]
    let mut app_builder = {
        let builder = tauri_app
            .plugin(tauri_plugin_oauth::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_opener::init());

        #[cfg(not(target_os = "android"))]
        {
            builder.plugin(window_state_plugin)
        }

        #[cfg(target_os = "android")]
        {
            builder
        }
    };

    // Single instance plugin is desktop-only
    #[cfg(not(target_os = "android"))]
    if !multi_instance {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(
            move |app, _args, _cwd| {
                if multi_window {
                    open_additional_window_safe(app);
                } else if let Some(window) = app.get_webview_window("pake") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            },
        ));
    }

    app_builder
        .invoke_handler(tauri::generate_handler![
            download_file,
            download_file_by_binary,
            send_notification,
            increment_dock_badge,
            set_dock_badge,
            set_dock_badge_label,
            clear_dock_badge,
            update_theme_mode,
            clear_cache_and_restart,
        ])
        .setup(move |app| {
            app.manage(MultiWindowState::new(
                pake_config.clone(),
                tauri_config.clone(),
            ));

            // --- Menu Construction Start (desktop only) ---
            #[cfg(target_os = "macos")]
            {
                app::menu::set_app_menu(app.app_handle(), multi_window, enable_find)?;

                app.on_menu_event(move |app_handle, event| {
                    app::menu::handle_menu_click(app_handle, event.id().as_ref());
                });
            }
            // --- Menu Construction End ---

            let window = set_window(app.app_handle(), &pake_config, &tauri_config)?;

            // Desktop-only setup: system tray and global shortcut
            #[cfg(not(target_os = "android"))]
            {
                set_system_tray(
                    app.app_handle(),
                    show_system_tray,
                    &pake_config.system_tray_path,
                    init_fullscreen,
                    multi_window,
                )?;
                set_global_shortcut(app.app_handle(), activation_shortcut, init_fullscreen)?;
            }

            // Show window after state restoration to prevent position flashing
            #[cfg(not(target_os = "android"))]
            if !start_to_tray {
                let window_clone = window.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(WINDOW_SHOW_DELAY)).await;
                    let _ = window_clone.show();

                    #[cfg(target_os = "linux")]
                    {
                        if init_fullscreen {
                            let _ = window_clone.set_fullscreen(true);
                            let _ = window_clone.set_focus();
                        } else {
                            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
                            let _ = window_clone.set_focus();
                        }
                    }
                });
            }

            // On Android, the window is always visible — no tray, no hide logic
            #[cfg(target_os = "android")]
            {
                let _ = &window;
            }

            Ok(())
        })
        .on_window_event(move |_window, _event| {
            // Window close event handling is desktop-only
            #[cfg(not(target_os = "android"))]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                if hide_on_close && _window.label() == "pake" {
                    let window = _window.clone();
                    tauri::async_runtime::spawn(async move {
                        #[cfg(target_os = "macos")]
                        {
                            if window.is_fullscreen().unwrap_or(false) {
                                let _ = window.set_fullscreen(false);
                                tokio::time::sleep(Duration::from_millis(900)).await;
                            }
                        }
                        #[cfg(target_os = "linux")]
                        {
                            if window.is_fullscreen().unwrap_or(false) {
                                let _ = window.set_fullscreen(false);
                                let _ = window.set_focus();
                            }
                        }
                        #[cfg(not(target_os = "macos"))]
                        let _ = window.minimize();
                        let _ = window.hide();
                    });
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .unwrap_or_else(|error| {
            eprintln!("[Pake] Fatal error while building Tauri application: {error}");
            std::process::exit(1);
        })
        .run(|_app, _event| {
            // Handle macOS dock icon click to reopen hidden window
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = _event
            {
                if !has_visible_windows {
                    if let Some(window) = _app.get_webview_window("pake") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    run_app()
}
