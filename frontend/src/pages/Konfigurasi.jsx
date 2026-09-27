import { useState, useEffect } from "react";
import KonfigurasiExpired from "./KonfigurasiExpired";
import KonfigurasiPrint from "./KonfigurasiPrint";
import KonfigurasiDatabase from "./KonfigurasiDatabase";

function Konfigurasi({ activeSubTab }) {
    const getInitialTab = () => {
        if (activeSubTab === "print" || activeSubTab === "instansi") return "print";
        if (activeSubTab === "database") return "database";
        return "expired";
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    useEffect(() => {
        if (activeSubTab) {
            if (activeSubTab === "print" || activeSubTab === "instansi") {
                setActiveTab("print");
            } else if (activeSubTab === "database") {
                setActiveTab("database");
            } else {
                setActiveTab("expired");
            }
        }
    }, [activeSubTab]);

    if (activeTab === "print") {
        return <KonfigurasiPrint />;
    }

    if (activeTab === "database") {
        return <KonfigurasiDatabase />;
    }

    return <KonfigurasiExpired />;
}

export default Konfigurasi;
