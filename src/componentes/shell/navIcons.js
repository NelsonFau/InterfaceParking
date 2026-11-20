// Ícono de trazo de 20 px de cada ítem del menú lateral (detalles de Claude Design 3), por ruta. Se usan las
// variantes "Outlined" de @mui/icons-material, las más cercanas a un ícono de trazo (el grosor 1.75 del diseño
// no se puede ajustar en estos íconos). Una ruta sin ícono no muestra ninguno.
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import LocalParkingOutlined from "@mui/icons-material/LocalParkingOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import MonitorHeartOutlined from "@mui/icons-material/MonitorHeartOutlined";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import PointOfSaleOutlined from "@mui/icons-material/PointOfSaleOutlined";
import SellOutlined from "@mui/icons-material/SellOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import TimelineOutlined from "@mui/icons-material/TimelineOutlined";

export const NAV_ICONS = {
  "/dashboard": DashboardOutlined,
  "/registrar-ingreso": LoginOutlined,
  "/operaciones": MonitorHeartOutlined,
  "/ocupaciones": DirectionsCarOutlined,
  "/alertas-operativas": NotificationsNoneOutlined,
  "/cocheras": LocalParkingOutlined,
  "/clientes": PeopleOutline,
  "/tarifas": SellOutlined,
  "/caja": PointOfSaleOutlined,
  "/usuarios": ManageAccountsOutlined,
  "/trazabilidad": TimelineOutlined,
  "/configuracion": SettingsOutlined,
};
