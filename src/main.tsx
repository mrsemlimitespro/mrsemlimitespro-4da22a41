import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/start";
import { getRouter } from "./router";

const router = getRouter();

hydrateRoot(document.getElementById("root")!, <StartClient router={router} />);


