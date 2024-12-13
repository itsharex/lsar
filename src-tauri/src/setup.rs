use std::sync::Arc;

use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use time::macros::{format_description, offset};
use tokio::sync::Mutex;
use tracing::Level;
use tracing_subscriber::fmt::time::OffsetTime;

use crate::{config::Config, eval::EvalChannel};

pub fn setup_logging() {
    let fmt = if cfg!(debug_assertions) {
        format_description!("[hour]:[minute]:[second].[subsecond digits:3]")
    } else {
        format_description!("[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]")
    };

    let timer = OffsetTime::new(offset!(+8), fmt);

    #[cfg(all(desktop, not(debug_assertions)))]
    let writer = {
        use crate::global::APP_CONFIG_DIR;
        use std::{fs::File, sync::Mutex};
        let log_file =
            File::create(APP_CONFIG_DIR.join("lsar.log")).expect("Failed to create the log file");
        Mutex::new(log_file)
    };

    #[cfg(any(debug_assertions, mobile))]
    let writer = std::io::stderr;

    let builder = tracing_subscriber::fmt()
        .with_max_level(Level::TRACE)
        .with_file(true)
        .with_line_number(true)
        .with_env_filter("lsar_lib")
        .with_target(false)
        .with_timer(timer)
        .with_writer(writer);

    if cfg!(debug_assertions) {
        builder.init();
    } else {
        builder.json().init();
    }
}

pub fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    info!(
        "Setting up application: version {}",
        app.package_info().version
    );

    #[cfg(all(desktop, not(debug_assertions)))]
    setup_updater(app)?;

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let config = Config::read_from_file()?;
        let window = create_main_window(app.app_handle(), config.transparent)?;
        if config.transparent {
            apply_window_effect(window)?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        create_main_window(app.app_handle())?;
    }

    let eval_channel = EvalChannel {
        sender: Arc::new(Mutex::new(None)),
    };

    app.manage(eval_channel);

    info!("Application setup completed");

    Ok(())
}

#[cfg(all(desktop, not(debug_assertions)))]
fn setup_updater(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    info!("Initializing update plugin");
    app.handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;

    info!("Spawning update check task");
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = crate::update::update(handle).await {
            error!("Failed to check for updates: {:?}", e);
        }
    });

    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn apply_window_effect(window: WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    {
        info!("Applying vibrancy effect on macOS");
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        window.set_title_bar_style(tauri::utils::TitleBarStyle::Overlay)?;
        apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)?;
    }

    #[cfg(target_os = "windows")]
    {
        info!("Applying acrylic effect on Windows");
        use window_vibrancy::apply_acrylic;
        apply_acrylic(&window, Some((18, 18, 18, 125)))?;
    }

    Ok(())
}

pub fn create_main_window(
    app: &tauri::AppHandle,
    #[cfg(any(target_os = "windows", target_os = "macos"))] transparent: bool,
) -> Result<WebviewWindow, Box<dyn std::error::Error>> {
    trace!("Initializing main application window");

    // Define window configuration parameters
    const WINDOW_TITLE: &str = "lsar";
    const WINDOW_WIDTH: f64 = 800.0;
    #[cfg(target_os = "macos")]
    const WINDOW_HEIGHT: f64 = 628.0;
    #[cfg(not(target_os = "macos"))]
    const WINDOW_HEIGHT: f64 = 600.0;

    info!(
        "Configuring window: title={}, dimensions={}x{}",
        WINDOW_TITLE, WINDOW_WIDTH, WINDOW_HEIGHT
    );

    let window_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title(WINDOW_TITLE)
        .resizable(false)
        .maximizable(false)
        .visible(false)
        .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT);

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    let window = window_builder.transparent(transparent).build();

    #[cfg(target_os = "linux")]
    let window = window_builder.build();

    // Attempt to build the window
    match window {
        Ok(w) => {
            info!("Main application window created successfully");
            Ok(w)
        }
        Err(build_error) => {
            error!(
                "Failed to create main window: {}. Detailed error: {:?}",
                build_error, build_error
            );
            Err(build_error.into())
        }
    }
}
