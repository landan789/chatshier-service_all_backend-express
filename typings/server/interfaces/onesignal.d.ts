declare module OneSignal {
    interface App {
        id: string;
        name: string;
        gcm_key: string;
        chrome_key: string;
        chrome_web_key: string;
        chrome_web_origin: string;
        chrome_web_gcm_sender_id: string;
        chrome_web_default_notification_icon: string;
        chrome_web_sub_domain: string;
        apns_env: string;
        apns_certificates: string;
        safari_apns_certificate: string;
        safari_site_origin: string;
        safari_push_id: string;
        safari_icon_16_16: string;
        safari_icon_32_32: string;
        safari_icon_64_64: string;
        safari_icon_128_128: string;
        safari_icon_256_256: string;
        site_name: string;
        created_at: string;
        updated_at: string;
        players: number;
        messageable_players: number;
        basic_auth_key: string;
    }

    interface Device {
        id: string;
        identifier: string;
        session_count: number;
        language: string;
        timezone: number;
        game_version:string;
        device_os: string;
        device_type: number;
        device_model: string;
        ad_id: null,
        tags: { [key: string]: string },
        last_active: number;
        playtime: number;
        amount_spent: number;
        created_at: number;
        invalid_identifier: boolean;
        badge_count: number;
        sdk: string;
        test_type: number;
        ip: string;
    }

    interface Devices {
        total_count: number;
        offset: number;
        limit: number;
        players: Device[]
    }

    // https://documentation.onesignal.com/reference#section-attachments
    interface Attachments {
        data?: any;
        url?: string;
        ios_attachments?: any;
        big_picture?: string;
        adm_big_picture?: string;
        chrome_big_picture?: string;
    }

    // https://documentation.onesignal.com/reference#section-action-buttons
    interface ActionButtons {
        buttons?: any[];
        web_buttons?: any[];
        ios_category?: string;
    }

    // https://documentation.onesignal.com/reference#section-content-language
    interface ContentLanguage {
        contents?: { [language: string]: string };
        headings?: { [language: string]: string };
        subtitle?: string;
        template_id?: string;
        content_available?: boolean;
        mutable_content?: boolean;
    }

    // https://documentation.onesignal.com/reference#section-appearance
    interface Appearance {
        android_channel_id?: string;
        existing_android_channel_id?: string;
        android_background_layout?: any;
        small_icon?: string;
        adm_small_icon?: string;
        adm_large_icon?: string;
        chrome_web_icon?: string;
        chrome_web_image?: string;
        firefox_icon?: string;
        chrome_icon?: string;
        chrome_web_badge?: string;
        ios_sound?: string;
        android_sound?: string;
        adm_sound?: string;
        wp_sound?: string;
        wp_wns_sound?: string;
        android_led_color?: string;
        android_accent_color?: string;
        android_visibility?: 1 | 0 | -1;
        ios_badgeType?: 'None' | 'SetTo' | 'Increase';
        ios_badgeCount?: number;
        collapse_id?: string;
    }

    // https://documentation.onesignal.com/reference#section-delivery
    interface Delivery {
        send_after?: number;
        delayed_option?: string;
        delivery_time_of_day?: string;
        ttl?: number;
        priority?: number;
    }

    // https://documentation.onesignal.com/reference#section-grouping-collapsing
    interface GroupingCollapsing {
        android_group?: string;
        android_group_message?: { [language: string]: string };
        adm_group?: string;
        adm_group_message?: { [language: string]: string };
    }

    // https://documentation.onesignal.com/reference#section-platform-to-deliver-to
    interface PlatformToDeliverTo {
        isIos?: boolean;
        isAndroid?: boolean;
        isAnyWeb?: boolean;
        isEmail?: boolean;
        isChromeWeb?: boolean;
        isFirefox?: boolean;
        isSafari?: boolean;
        isWP?: boolean;
        isWP_WNS?: boolean;
        isAdm?: boolean;
        isChrome?: boolean;
        isAlexa?: boolean;
    }

    interface Notification extends Attachments,
        ActionButtons, Appearance, Delivery,
        GroupingCollapsing, PlatformToDeliverTo,
        ContentLanguage {
        spoken_text?: any;
        alexa_ssml?: string;
        alexa_display_title?: string;
        amazon_background_data?: any;
        app_id?: string;
        canceled?: boolean;
        converted?: number;
        errored?: number;
        failed?: number;
        id?: string;
        include_player_ids?: string[];
        included_segments?: ['Active Users' | 'Inactive Users'];
        excluded_segments?: ['Active Users' | 'Inactive Users'];
        apns_alert?: any,
        large_icon?: string;
        queued_at?: number;
        remaining?: number;
        successful?: number;
        tags?: any;
        filters?: any;
        web_push_topic?: string;
    }

    interface Notifications {
        total_count: number;
        offset: number;
        limit: number;
        notifications: Notification[]
    }
}