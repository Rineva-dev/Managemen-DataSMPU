// ======================================
// notification.js
// Modern Toast Notification
// ======================================

window.showNotification = function(message, type = "success", duration = 3500){

    const container = document.getElementById("toast-container");
    if(!container){
        console.warn("toast-container tidak ditemukan");
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "check-circle";

    if(type === "error") icon = "x-circle";
    if(type === "warning") icon = "alert-triangle";

    toast.innerHTML = `
        <i data-lucide="${icon}" class="toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    if(window.lucide){
        lucide.createIcons();
    }

    setTimeout(()=>{

        toast.classList.add("hide");

        setTimeout(()=>{
            toast.remove();
        },300);

    },duration);

}

// ======================================
// SAVE NOTIFICATION
// ======================================

window.persistNotification = function(
    message,
    type = "success",
    duration = 3500
){

    sessionStorage.setItem(
        "pending_notification",
        JSON.stringify({
            message,
            type,
            duration
        })
    );

};


// ======================================
// RESTORE NOTIFICATION AFTER RELOAD
// ======================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const pending =
            sessionStorage.getItem(
                "pending_notification"
            );

        if (!pending) return;

        try {

            const notif =
                JSON.parse(pending);

            showNotification(
                notif.message,
                notif.type,
                notif.duration
            );

        } catch(err) {

            console.error(err);

        }

        sessionStorage.removeItem(
            "pending_notification"
        );

    }
);