import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  Eye,
  History,
  Home,
  ImagePlus,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Minus,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  ShoppingBag,
  TrendingUp,
  Trash2,
  Utensils,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Restaurant = {
  id: number;
  name: string;
  phone: string;
  address: string;
  position: string;
  email: string;
  photo_url: string;
  status: "active" | "suspended";
  joined: string;
};

type FormValues = Omit<Restaurant, "id" | "status" | "joined">;
type RestaurantFormValues = FormValues & { password: string };
const emptyForm: RestaurantFormValues = {
  name: "",
  phone: "",
  address: "",
  position: "",
  email: "",
  photo_url: "",
  password: "",
};
type Dish = {
  id: number;
  menuId?: number;
  name: string;
  description: string;
  price: number;
  photo_url?: string;
  available: boolean;
  today: boolean;
};
type CartItem = Dish & { quantity: number };
type RestaurantOrder = {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  delivery_fee: number;
  notes: string | null;
  payment_method: "wave" | "sur_place";
  status: string;
  total_amount: number;
  created_at: string;
};
type RestaurantExpense = {
  id: number;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  created_at: string;
};
type RestaurantDebt = {
  id: number;
  creditor: string;
  amount: number;
  description: string | null;
  debt_date: string;
  paid_at: string | null;
  debt_type: "Je dois" | "On me doit";
  status: "À payer" | "Payée";
  created_at: string;
};
const orderStatuses = [
  "En attente",
  "Confirmée",
  "En préparation",
  "Prête",
  "Livrée",
  "Annulée",
] as const;
const ADMIN_EMAIL = "lamine180903@gmail.com";
const ADMIN_PASSWORD = "Lamine180903";
const menuIdCache = new Map<number, number>();

const readOptimizedImage = (file: File, maxSize = 900) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.78));
      };
      image.onerror = () => reject(new Error("image invalide"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function LoadingIndicator({ label }: { label: string }) {
  return (
    <div className="loading-indicator" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");
  const [modal, setModal] = useState<"add" | "edit" | "details" | null>(null);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantFormValues>(emptyForm);
  const [mobileNav, setMobileNav] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("sokone-admin-auth") === "true",
  );
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [restaurantCredentials, setRestaurantCredentials] = useState<
    Record<string, { password: string; restaurantId: number }>
  >(() =>
    JSON.parse(localStorage.getItem("sokone-restaurant-credentials") ?? "{}"),
  );
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [showRestaurateur, setShowRestaurateur] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isDishesLoading, setIsDishesLoading] = useState(false);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [restaurantExpenses, setRestaurantExpenses] = useState<RestaurantExpense[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Achats",
    amount: "",
    description: "",
  });
  const [restaurantPage, setRestaurantPage] = useState<"dashboard" | "menu" | "orders" | "expenses" | "debts">("dashboard");
  const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([]);
  const [isDebtsLoading, setIsDebtsLoading] = useState(false);
  const [isSavingDebt, setIsSavingDebt] = useState(false);
  const [debtHistoryOpen, setDebtHistoryOpen] = useState(false);
  const [debtForm, setDebtForm] = useState({ creditor: "", amount: "", description: "", debt_type: "Je dois" as "Je dois" | "On me doit" });
  const [dishModal, setDishModal] = useState<"add" | "edit" | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dishForm, setDishForm] = useState({
    name: "",
    description: "",
    price: "",
    photo_url: "",
  });
  const [isSavingDish, setIsSavingDish] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [publicMenuDishes, setPublicMenuDishes] = useState<Dish[]>([]);
  const [isPublicMenuLoading, setIsPublicMenuLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isDeliverySelected, setIsDeliverySelected] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
    const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wave" | "sur_place">("sur_place");
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState("");
  const [orderError, setOrderError] = useState("");
  const [showOrders, setShowOrders] = useState(false);
  const [orderNumber, setOrderNumber] = useState(
    () => localStorage.getItem("menu-sokone-last-order-number") ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState(
    () => localStorage.getItem("menu-sokone-last-order-number") ?? "",
  );
  const [trackingPhone, setTrackingPhone] = useState("");
  const [numberCopied, setNumberCopied] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<{
    id: number;
    restaurantName: string;
    status: string;
    total_amount: number;
    created_at: string;
    notes: string | null;
    items: Array<{ name: string; quantity: number; unit_price: number }>;
  } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [adminPanel, setAdminPanel] = useState<"settings" | "help" | null>(
    null,
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const playOrderNotification = () => {
    const audio = notificationAudio.current ?? new Audio("/sounds/new-order.mp3");
    notificationAudio.current = audio;
    audio.volume = 1;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };
  const ensureRestaurantMenu = async (restaurantId: number) => {
    if (!supabase) return null;
    const cachedMenuId = menuIdCache.get(restaurantId);
    if (cachedMenuId) return { id: cachedMenuId };

    const { data: existingMenu, error: menuQueryError } = await supabase
      .from("menus")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (menuQueryError) throw menuQueryError;
    if (existingMenu) {
      menuIdCache.set(restaurantId, existingMenu.id);
      return existingMenu;
    }

    const { data: createdMenu, error: menuInsertError } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurantId,
        name: "Menu principal",
        description: "Catalogue du restaurant",
        is_active: true,
      })
      .select("id")
      .single();
    if (menuInsertError || !createdMenu) {
      const { data: concurrentMenu } = await supabase
        .from("menus")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (concurrentMenu) {
        menuIdCache.set(restaurantId, concurrentMenu.id);
        return concurrentMenu;
      }
      throw menuInsertError ?? new Error("création du menu impossible");
    }
    menuIdCache.set(restaurantId, createdMenu.id);
    return createdMenu;
  };
  useEffect(() => {
    localStorage.setItem(
      "sokone-restaurant-credentials",
      JSON.stringify(restaurantCredentials),
    );
  }, [restaurantCredentials]);

  useEffect(() => {
    const loadRestaurants = async () => {
      if (supabase === null) {
        setIsLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("restaurants")
        .select(
          "id, name, status, phone, address, position, owner_email, photo_url, created_at",
        )
        .order("created_at", { ascending: true });

      if (queryError) {
        const legacyResult = await supabase
          .from("restaurants")
          .select("id, name, status, created_at")
          .order("created_at", { ascending: true });

        if (legacyResult.error) {
          setError(
            "Les données Supabase sont indisponibles pour le moment. Vérifiez les politiques de lecture de la table restaurants.",
          );
        } else if (legacyResult.data) {
          setRestaurants(
            legacyResult.data.map((restaurant) => ({
              id: restaurant.id,
              name: restaurant.name,
              phone: "+221 77 000 00 00",
              address: "Sokone, Sénégal",
              position: "14.0800, -16.3700",
              email: "contact@menu-sokone.sn",
              photo_url: "",
              status: restaurant.status === "Ouvert" ? "active" : "suspended",
              joined: new Date(restaurant.created_at).toLocaleDateString(
                "fr-FR",
                { day: "2-digit", month: "long", year: "numeric" },
              ),
            })),
          );
          setError(null);
        }
      } else if (data) {
        setRestaurants(
          data.map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
            phone: restaurant.phone ?? "+221 77 000 00 00",
            address: restaurant.address ?? "Sokone, Sénégal",
            position: restaurant.position ?? "14.0800, -16.3700",
            email: restaurant.owner_email ?? "contact@menu-sokone.sn",
            photo_url: restaurant.photo_url ?? "",
            status: restaurant.status === "Ouvert" ? "active" : "suspended",
            joined: new Date(restaurant.created_at).toLocaleDateString(
              "fr-FR",
              { day: "2-digit", month: "long", year: "numeric" },
            ),
          })),
        );
      }

      setIsLoading(false);
    };

    void loadRestaurants();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const supabaseClient = supabase;

    const restaurantChannel = supabaseClient
      .channel("restaurants-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        (payload) => {
          const record = (payload.new ?? payload.old) as {
            id?: number;
            name?: string;
            status?: string;
            phone?: string;
            address?: string;
            position?: string;
            owner_email?: string;
            photo_url?: string;
            created_at?: string;
          };
          if (!record.id) return;
          if (payload.eventType === "DELETE") {
            setRestaurants((current) => current.filter((item) => item.id !== record.id));
            return;
          }
          const restaurant: Restaurant = {
            id: record.id,
            name: record.name ?? "Restaurant",
            phone: record.phone ?? "+221 77 000 00 00",
            address: record.address ?? "Sokone, Sénégal",
            position: record.position ?? "14.0800, -16.3700",
            email: record.owner_email ?? "contact@menu-sokone.sn",
            photo_url: record.photo_url ?? "",
            status: record.status === "Ouvert" ? "active" : "suspended",
            joined: record.created_at
              ? new Date(record.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Aujourd'hui",
          };
          setRestaurants((current) => {
            const exists = current.some((item) => item.id === restaurant.id);
            return exists
              ? current.map((item) => (item.id === restaurant.id ? restaurant : item))
              : [...current, restaurant];
          });
          setCurrentRestaurant((current) =>
            current?.id === restaurant.id ? restaurant : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(restaurantChannel);
    };
  }, []);

  useEffect(() => {
    const loadDishes = async () => {
      if (!showRestaurateur || !currentRestaurant || !supabase) return;

      setIsDishesLoading(true);
      setDishes([]);
      setMenuId(null);

      let menu;
      try {
        menu = await ensureRestaurantMenu(currentRestaurant.id);
      } catch (menuError) {
        setError(
          `Menu introuvable : ${menuError instanceof Error ? menuError.message : "création impossible"}`,
        );
        setIsDishesLoading(false);
        return;
      }
      if (!menu) {
        setIsDishesLoading(false);
        return;
      }

      setMenuId(menu.id);
      const [
        { data: items, error: itemsError },
        { data: todayItems, error: todayError },
      ] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id, name, description, price, image_url, is_available")
          .eq("menu_id", menu.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("restaurant_menu_days")
          .select("menu_item_id")
          .eq("restaurant_id", currentRestaurant.id)
          .eq("menu_date", new Date().toISOString().slice(0, 10)),
      ]);
      if (itemsError || todayError) {
        setError(
          `Impossible de charger le menu : ${(itemsError ?? todayError)?.message}`,
        );
        setIsDishesLoading(false);
        return;
      }
      const todayIds = new Set(
        (todayItems ?? []).map((item) => item.menu_item_id),
      );
      setDishes(
        (items ?? []).map((item) => ({
          id: item.id,
          menuId: menu.id,
          name: item.name,
          description: item.description ?? "",
          price: Number(item.price),
          photo_url: item.image_url ?? "",
          available: item.is_available,
          today: todayIds.has(item.id),
        })),
      );
      setError(null);
      setIsDishesLoading(false);
    };

    void loadDishes();
  }, [currentRestaurant?.id, showRestaurateur]);

  useEffect(() => {
    const loadRestaurantOrders = async () => {
      if (!showRestaurateur || !currentRestaurant || !supabase) return;
      setIsOrdersLoading(true);
      const { data, error: ordersError } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, delivery_address, notes, delivery_fee, payment_method, status, total_amount, created_at")
        .eq("restaurant_id", currentRestaurant.id)
        .order("created_at", { ascending: false });
      if (ordersError) {
        setError(`Impossible de charger les commandes : ${ordersError.message}`);
      } else {
        setRestaurantOrders(
          (data ?? []).map((order) => ({
            ...order,
            delivery_fee: Number(order.delivery_fee ?? 0),
            total_amount: Number(order.total_amount ?? 0),
            payment_method: order.payment_method === "wave" ? "wave" : "sur_place",
          })),
        );
      }
      setIsOrdersLoading(false);
    };

    void loadRestaurantOrders();
  }, [currentRestaurant?.id, showRestaurateur]);

  useEffect(() => {
    if (!showRestaurateur || !currentRestaurant) return;
    const unlockAudio = () => {
      void notificationAudio.current?.load();
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [currentRestaurant?.id, showRestaurateur]);

  useEffect(() => {
    if (!supabase || !showRestaurateur || !currentRestaurant) return;
    const supabaseClient = supabase;
    const orderChannel = supabaseClient
      .channel(`orders-live-${currentRestaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${currentRestaurant.id}`,
        },
        (payload) => {
          const record = payload.new as RestaurantOrder;
          const nextOrder: RestaurantOrder = {
            ...record,
            delivery_fee: Number(record.delivery_fee ?? 0),
            total_amount: Number(record.total_amount ?? 0),
            payment_method: record.payment_method === "wave" ? "wave" : "sur_place",
          };
          setRestaurantOrders((current) => current.some((order) => order.id === nextOrder.id) ? current : [nextOrder, ...current]);
          playOrderNotification();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${currentRestaurant.id}`,
        },
        (payload) => {
          const record = payload.new as RestaurantOrder;
          setRestaurantOrders((current) => current.map((order) => order.id === record.id ? {
            ...order,
            ...record,
            delivery_fee: Number(record.delivery_fee ?? order.delivery_fee),
            total_amount: Number(record.total_amount ?? order.total_amount),
            payment_method: record.payment_method === "wave" ? "wave" : "sur_place",
          } : order));
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(orderChannel);
    };
  }, [currentRestaurant?.id, showRestaurateur]);

  useEffect(() => {
    const loadRestaurantExpenses = async () => {
      if (!showRestaurateur || !currentRestaurant || !supabase) return;
      setIsExpensesLoading(true);
      const { data, error: expensesError } = await supabase
        .from("expenses")
        .select("id, category, amount, expense_date, description, created_at")
        .eq("restaurant_id", currentRestaurant.id)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (expensesError) {
        setError(`Impossible de charger les dépenses : ${expensesError.message}`);
      } else {
        setRestaurantExpenses(
          (data ?? []).map((expense) => ({
            ...expense,
            amount: Number(expense.amount),
          })),
        );
      }
      setIsExpensesLoading(false);
    };

    void loadRestaurantExpenses();
  }, [currentRestaurant?.id, showRestaurateur]);

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !currentRestaurant) return;
    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Indiquez un montant de dépense valide.");
      return;
    }
    setIsSavingExpense(true);
    setError(null);
    const { data, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        restaurant_id: currentRestaurant.id,
        category: expenseForm.category,
        amount,
        description: expenseForm.description.trim() || null,
      })
      .select("id, category, amount, expense_date, description, created_at")
      .single();
    if (expenseError || !data) {
      setError(expenseError?.message ?? "La dépense n’a pas pu être enregistrée.");
    } else {
      setRestaurantExpenses((current) => [{ ...data, amount: Number(data.amount) }, ...current]);
      setExpenseForm({
        category: "Achats",
        amount: "",
        description: "",
      });
    }
    setIsSavingExpense(false);
  };

  useEffect(() => {
    const loadRestaurantDebts = async () => {
      if (!showRestaurateur || !currentRestaurant || !supabase) return;
      setIsDebtsLoading(true);
      const { data, error: debtsError } = await supabase
        .from("debts")
        .select("id, creditor, amount, description, debt_date, paid_at, debt_type, status, created_at")
        .eq("restaurant_id", currentRestaurant.id)
        .order("debt_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (debtsError) {
        setError(`Impossible de charger les dettes : ${debtsError.message}`);
      } else {
        setRestaurantDebts(
          (data ?? []).map((debt) => ({
            ...debt,
            amount: Number(debt.amount),
            debt_type: debt.debt_type === "On me doit" ? "On me doit" : "Je dois",
            status: debt.status === "Payée" ? "Payée" : "À payer",
          })),
        );
      }
      setIsDebtsLoading(false);
    };

    void loadRestaurantDebts();
  }, [currentRestaurant?.id, showRestaurateur]);

  const saveDebt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !currentRestaurant) return;
    const amount = Number(debtForm.amount);
    if (!debtForm.creditor.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Indiquez un créancier et un montant de dette valide.");
      return;
    }
    setIsSavingDebt(true);
    setError(null);
    const { data, error: debtError } = await supabase
      .from("debts")
      .insert({
        restaurant_id: currentRestaurant.id,
        creditor: debtForm.creditor.trim(),
        amount,
        description: debtForm.description.trim() || null,
        debt_type: debtForm.debt_type,
      })
      .select("id, creditor, amount, description, debt_date, paid_at, debt_type, status, created_at")
      .single();
    if (debtError || !data) {
      setError(debtError?.message ?? "La dette n’a pas pu être enregistrée.");
    } else {
      setRestaurantDebts((current) => [{ ...data, amount: Number(data.amount), paid_at: data.paid_at ?? null, debt_type: data.debt_type === "On me doit" ? "On me doit" : "Je dois", status: data.status === "Payée" ? "Payée" : "À payer" }, ...current]);
      setDebtForm({ creditor: "", amount: "", description: "", debt_type: "Je dois" });
    }
    setIsSavingDebt(false);
  };

  const updateDebtStatus = async (debtId: number, status: "Payée") => {
    if (!supabase) return;
    const paidAt = status === "Payée" ? new Date().toISOString() : null;
    const { error: debtError } = await supabase.from("debts").update({ status, paid_at: paidAt }).eq("id", debtId);
    if (debtError) {
      setError(`Statut de dette impossible à modifier : ${debtError.message}`);
      return;
    }
    setRestaurantDebts((current) => current.map((debt) => debt.id === debtId ? { ...debt, status, paid_at: paidAt } : debt));
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    if (!supabase) return;
    const { error: statusError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (statusError) {
      setError(`Statut de commande impossible à modifier : ${statusError.message}`);
      return;
    }
    setRestaurantOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  };

  useEffect(() => {
    if (!supabase || !showRestaurateur || !menuId || !currentRestaurant) return;
    const supabaseClient = supabase;
    const today = new Date().toISOString().slice(0, 10);
    const menuChannel = supabaseClient
      .channel(`menu-live-sync-${menuId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
          filter: `menu_id=eq.${menuId}`,
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as {
            id?: number;
            menu_id?: number;
            name?: string;
            description?: string;
            price?: number;
            image_url?: string;
            is_available?: boolean;
          };
          if (!record.id) return;
          const recordId = record.id;
          if (payload.eventType === "DELETE") {
            setDishes((current) => current.filter((dish) => dish.id !== recordId));
            return;
          }
          setDishes((current) => {
            const existing = current.find((dish) => dish.id === recordId);
            const nextDish: Dish = {
              id: recordId,
              menuId,
              name: record.name ?? existing?.name ?? "Plat",
              description: record.description ?? existing?.description ?? "",
              price: Number(record.price ?? existing?.price ?? 0),
              photo_url: record.image_url ?? existing?.photo_url ?? "",
              available: record.is_available ?? existing?.available ?? true,
              today: existing?.today ?? false,
            };
            return existing
              ? current.map((dish) => (dish.id === nextDish.id ? nextDish : dish))
              : [...current, nextDish];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_menu_days",
          filter: `restaurant_id=eq.${currentRestaurant.id}`,
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as {
            menu_item_id?: number;
            menu_date?: string;
          };
          if (!record.menu_item_id || record.menu_date !== today) return;
          const isToday = payload.eventType !== "DELETE";
          setDishes((current) =>
            current.map((dish) =>
              dish.id === record.menu_item_id ? { ...dish, today: isToday } : dish,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(menuChannel);
    };
  }, [currentRestaurant?.id, menuId, showRestaurateur]);

  const visibleRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          `${restaurant.name} ${restaurant.address}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (filter === "all" || restaurant.status === filter),
      ),
    [filter, restaurants, search],
  );
  const activeCount = restaurants.filter(
    (restaurant) => restaurant.status === "active",
  ).length;
  const suspendedCount = restaurants.length - activeCount;
  const openAdd = () => {
    setForm(emptyForm);
    setSelected(null);
    setModal("add");
  };
  const openEdit = (restaurant: Restaurant) => {
    setSelected(restaurant);
    setForm({
      name: restaurant.name,
      phone: restaurant.phone,
      address: restaurant.address,
      position: restaurant.position,
      email: restaurant.email,
      photo_url: restaurant.photo_url,
      password: "",
    });
    setModal("edit");
  };
  const openDetails = async (restaurant: Restaurant) => {
    setSelected(restaurant);
    setPublicMenuDishes([]);
    setCartItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setIsDeliverySelected(false);
    setDeliveryAddress("");
    setOrderNotes("");
    setPaymentMethod("sur_place");
    setOrderSuccess("");
    setOrderError("");
    setIsPublicMenuLoading(Boolean(supabase));
    setModal("details");
    if (!supabase) {
      setIsPublicMenuLoading(false);
      return;
    }
    const cachedMenuId = menuIdCache.get(restaurant.id);
    const { data: queriedMenu } = cachedMenuId
      ? { data: { id: cachedMenuId } }
      : await supabase
          .from("menus")
          .select("id")
          .eq("restaurant_id", restaurant.id)
          .eq("is_active", true)
          .maybeSingle();
    const menu = queriedMenu;
    if (!menu) {
      setIsPublicMenuLoading(false);
      return;
    }
    menuIdCache.set(restaurant.id, menu.id);
    const [{ data: items }, { data: todayItems }] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, is_available")
        .eq("menu_id", menu.id)
        .eq("is_available", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("restaurant_menu_days")
        .select("menu_item_id")
        .eq("restaurant_id", restaurant.id)
        .eq("menu_date", new Date().toISOString().slice(0, 10)),
    ]);
    const todayIds = new Set(
      (todayItems ?? []).map((item) => item.menu_item_id),
    );
    setPublicMenuDishes(
      (items ?? [])
        .filter((item) => todayIds.has(item.id))
        .map((item) => ({
          id: item.id,
          menuId: menu.id,
          name: item.name,
          description: item.description ?? "",
          price: Number(item.price),
          photo_url: item.image_url ?? "",
          available: item.is_available,
          today: true,
        })),
    );
      setIsPublicMenuLoading(false);
  };
  const openPublicMenu = (restaurant: Restaurant) => {
    if (restaurant.status !== "active") return;
    void openDetails(restaurant);
  };
  const addToCart = (dish: Dish) => {
    setOrderSuccess("");
    setOrderError("");
    setCartItems((current) => {
      const existing = current.find((item) => item.id === dish.id);
      return existing
        ? current.map((item) =>
            item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { ...dish, quantity: 1 }];
    });
  };
  const updateCartQuantity = (dishId: number, change: number) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === dishId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selected || !cartItems.length) return;

    const normalizedPhone = customerPhone.replace(/\s/g, "");
    if (!customerName.trim() || !normalizedPhone || (isDeliverySelected && !deliveryAddress.trim())) {
      setOrderError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (!/^7\d{8}$/.test(normalizedPhone)) {
      setOrderError("Le numéro doit commencer par 7 et contenir 9 chiffres, par exemple 7X XXX XX XX.");
      return;
    }

    setIsOrderSubmitting(true);
    setOrderError("");
    const dishesTotal = cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const deliveryFee = isDeliverySelected ? 500 : 0;
    const totalAmount = dishesTotal + deliveryFee;
    const { data: order, error: orderInsertError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: selected.id,
        customer_name: customerName.trim(),
        customer_phone: normalizedPhone,
        delivery_address: isDeliverySelected ? deliveryAddress.trim() : null,
        notes: orderNotes.trim() || null,
        delivery_fee: deliveryFee,
        payment_method: paymentMethod,
        total_amount: totalAmount,
      })
      .select("id, status, total_amount, created_at, notes")
      .single();
    if (orderInsertError || !order) {
      setOrderError(
        orderInsertError?.message ?? "La commande n’a pas pu être envoyée.",
      );
      setIsOrderSubmitting(false);
      return;
    }

    const { error: itemsInsertError } = await supabase.from("order_items").insert(
      cartItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      })),
    );
    if (itemsInsertError) {
      setOrderError(
        itemsInsertError.message ?? "Les plats de la commande n’ont pas pu être enregistrés.",
      );
      setIsOrderSubmitting(false);
      return;
    }

    const newOrderNumber = `SM-${String(order.id).padStart(4, "0")}`;
    localStorage.setItem("menu-sokone-last-order-number", newOrderNumber);
    setCartItems([]);
    setOrderNumber(newOrderNumber);
    setTrackingNumber(newOrderNumber);
    setTrackedOrder({
      id: order.id,
      restaurantName: selected.name,
      status: order.status ?? "En attente",
      total_amount: Number(order.total_amount ?? totalAmount),
      created_at: order.created_at ?? new Date().toISOString(),
      notes: orderNotes.trim() || null,
      items: cartItems.map((item) => ({ name: item.name, quantity: item.quantity, unit_price: item.price })),
    });
    setNumberCopied(false);
    setTrackingPhone(normalizedPhone);
    setShowOrders(true);
    setModal(null);
    setIsOrderSubmitting(false);
  };
  const copyOrderNumber = async () => {
    if (!orderNumber) return;
    await navigator.clipboard.writeText(orderNumber);
    setNumberCopied(true);
  };
  const trackOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const normalizedNumber = trackingNumber.trim().toUpperCase();
    const normalizedPhone = trackingPhone.replace(/\s/g, "");
    const orderId = Number(normalizedNumber.replace(/^SM-/, ""));
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setTrackedOrder(null);
      setTrackingError("Entrez un numéro de commande valide, par exemple SM-2847.");
      return;
    }
    if (!/^7\d{8}$/.test(normalizedPhone)) {
      setTrackedOrder(null);
      setTrackingError("Entrez le numéro de téléphone utilisé pour la commande, avec 9 chiffres commençant par 7.");
      return;
    }

    setTrackingLoading(true);
    setTrackingError("");
    const { data, error: trackingQueryError } = await supabase
      .from("orders")
      .select("id, restaurant_id, status, total_amount, created_at, notes")
      .eq("id", orderId)
      .eq("customer_phone", normalizedPhone)
      .maybeSingle();
    if (trackingQueryError || !data) {
      setTrackedOrder(null);
      setTrackingError("Aucune commande trouvée avec ce numéro.");
    } else {
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity, unit_price")
        .eq("order_id", data.id);
      if (itemsError) {
        setTrackedOrder(null);
        setTrackingError("Les détails de cette commande ne sont pas disponibles.");
        setTrackingLoading(false);
        return;
      }
      const menuItemIds = (orderItems ?? []).map((item) => item.menu_item_id);
      const { data: menuItems, error: menuItemsError } = menuItemIds.length
        ? await supabase.from("menu_items").select("id, name").in("id", menuItemIds)
        : { data: [], error: null };
      if (menuItemsError) {
        setTrackedOrder(null);
        setTrackingError("Les détails des plats ne sont pas disponibles.");
        setTrackingLoading(false);
        return;
      }
      const itemNames = new Map((menuItems ?? []).map((item) => [item.id, item.name]));
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", data.restaurant_id)
        .maybeSingle();
      setTrackedOrder({
        id: data.id,
        restaurantName: restaurant?.name ?? "Restaurant",
        status: data.status,
        total_amount: Number(data.total_amount),
        created_at: data.created_at,
        notes: data.notes ?? null,
        items: (orderItems ?? []).map((item) => ({
          name: itemNames.get(item.menu_item_id) ?? "Plat",
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
        })),
      });
    }
    setTrackingLoading(false);
  };
  useEffect(() => {
    if (!supabase || !showOrders || !trackedOrder) return;
    const supabaseClient = supabase;
    const orderChannel = supabaseClient
      .channel(`order-status-live-sync-${trackedOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${trackedOrder.id}`,
        },
        (payload) => {
          const record = payload.new as {
            id?: number;
            status?: string;
            total_amount?: number;
            created_at?: string;
          };
          if (record.id !== trackedOrder.id) return;
          setTrackedOrder((current) =>
            current
              ? {
                  ...current,
                  status: record.status ?? current.status,
                  total_amount: Number(record.total_amount ?? current.total_amount),
                  created_at: record.created_at ?? current.created_at,
                }
              : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(orderChannel);
    };
  }, [showOrders, trackedOrder?.id]);
  useEffect(() => {
    if (!supabase || modal !== "details" || !selected || selected.status !== "active") return;
    const supabaseClient = supabase;
    const restaurant = selected;
    const publicChannel = supabaseClient
      .channel(`public-menu-live-sync-${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          void openDetails(restaurant);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_menu_days",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          void openDetails(restaurant);
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(publicChannel);
    };
  }, [modal, selected?.id, selected?.status]);
  const saveRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const password =
      (
        event.currentTarget.querySelector(
          'input[type="password"]',
        ) as HTMLInputElement | null
      )?.value.trim() ?? form.password;
    const { password: _formPassword, ...restaurantFields } = form;
    restaurantFields.name = restaurantFields.name.trim();
    restaurantFields.phone = restaurantFields.phone.trim();
    restaurantFields.address = restaurantFields.address.trim();
    restaurantFields.position = restaurantFields.position.trim();
    restaurantFields.email = restaurantFields.email.trim().toLowerCase();
    if (
      !restaurantFields.name ||
      !restaurantFields.phone ||
      !restaurantFields.address ||
      !restaurantFields.email
    ) {
      setError(
        "Veuillez renseigner tous les champs obligatoires du restaurant.",
      );
      return;
    }
    const photoInput = event.currentTarget.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    const photoFile = photoInput?.files?.[0];
    if (photoFile) {
      restaurantFields.photo_url = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(photoFile);
        },
      );
    }
    if (modal === "edit" && selected) {
      if (supabase) {
        const { error: updateError } = await supabase
          .from("restaurants")
          .update({
            name: restaurantFields.name,
            phone: restaurantFields.phone,
            address: restaurantFields.address,
            position: restaurantFields.position,
            owner_email: restaurantFields.email,
            photo_url: restaurantFields.photo_url,
          })
          .eq("id", selected.id);
        if (updateError) {
          setError(`Modification impossible : ${updateError.message}`);
          return;
        }
      }
      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === selected.id
            ? { ...restaurant, ...restaurantFields }
            : restaurant,
        ),
      );
      if (password)
        setRestaurantCredentials((current) => ({
          ...current,
          [restaurantFields.email.toLowerCase()]: {
            password,
            restaurantId: selected.id,
          },
        }));
    } else if (supabase) {
      const { data, error: insertError } = await supabase
        .from("restaurants")
        .insert({
          name: restaurantFields.name,
          phone: restaurantFields.phone,
          address: restaurantFields.address,
          position: restaurantFields.position,
          owner_email: restaurantFields.email,
          photo_url: restaurantFields.photo_url,
          status: "Ouvert",
          featured_dish: "",
          tag: "Nouveau",
        })
        .select(
          "id, name, status, phone, address, position, owner_email, photo_url, created_at",
        )
        .single();
      if (insertError || !data) {
        setError(
          `Création impossible : ${insertError?.message ?? "réponse Supabase vide"}`,
        );
        return;
      }
      const createdRestaurant = {
        id: data.id,
        name: data.name,
        phone: data.phone ?? restaurantFields.phone,
        address: data.address ?? restaurantFields.address,
        position: data.position ?? restaurantFields.position,
        email: data.owner_email ?? restaurantFields.email,
        photo_url: data.photo_url ?? restaurantFields.photo_url,
        status: "active" as const,
        joined: new Date(data.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      };
      setRestaurants((current) => [...current, createdRestaurant]);
      setRestaurantCredentials((current) => ({
        ...current,
        [restaurantFields.email.toLowerCase()]: {
          password,
          restaurantId: data.id,
        },
      }));
    } else {
      const id = Date.now();
      setRestaurants((current) => [
        ...current,
        { ...restaurantFields, id, status: "active", joined: "Aujourd'hui" },
      ]);
      setRestaurantCredentials((current) => ({
        ...current,
        [restaurantFields.email.toLowerCase()]: { password, restaurantId: id },
      }));
    }
    setModal(null);
  };
  const toggleStatus = async (restaurant: Restaurant) => {
    const nextStatus = restaurant.status === "active" ? "suspended" : "active";
    if (supabase) {
      const { error: statusError } = await supabase
        .from("restaurants")
        .update({ status: nextStatus === "active" ? "Ouvert" : "Fermé" })
        .eq("id", restaurant.id);
      if (statusError) {
        setError(`Statut impossible à modifier : ${statusError.message}`);
        return;
      }
    }
    setRestaurants((current) =>
      current.map((item) =>
        item.id === restaurant.id ? { ...item, status: nextStatus } : item,
      ),
    );
    setCurrentRestaurant((current) =>
      current?.id === restaurant.id ? { ...current, status: nextStatus } : current,
    );
  };
  const deleteRestaurant = async (restaurant: Restaurant) => {
    if (!window.confirm(`Supprimer ${restaurant.name} ?`)) return;
    if (supabase) {
      const { error: deleteError } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", restaurant.id);
      if (deleteError) {
        setError(`Suppression impossible : ${deleteError.message}`);
        return;
      }
    }
    setRestaurants((current) =>
      current.filter((item) => item.id !== restaurant.id),
    );
    setModal(null);
  };
  const openLogin = () => {
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setShowLogin(true);
  };
  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const restaurantAccount = restaurantCredentials[email];
    if (email === ADMIN_EMAIL && loginPassword.trim() === ADMIN_PASSWORD) {
      sessionStorage.setItem("sokone-admin-auth", "true");
      setIsAuthenticated(true);
      setCurrentRestaurant(null);
      setShowLogin(false);
      setShowHome(false);
      return;
    }
    if (
      restaurantAccount &&
      loginPassword.trim() === restaurantAccount.password
    ) {
      const restaurant = restaurants.find(
        (item) => item.id === restaurantAccount.restaurantId,
      );
      if (restaurant) {
        setCurrentRestaurant(restaurant);
        setIsAuthenticated(true);
        setShowLogin(false);
        setShowHome(false);
        setShowRestaurateur(true);
        return;
      }
    }
    if (email !== ADMIN_EMAIL || loginPassword.trim() !== ADMIN_PASSWORD) {
      setLoginError("Email ou mot de passe incorrect.");
      return;
    }
  };
  const handleLogout = () => {
    sessionStorage.removeItem("sokone-admin-auth");
    setIsAuthenticated(false);
    setCurrentRestaurant(null);
    setShowRestaurateur(false);
    setShowHome(true);
  };
  const openDishForm = (dish?: Dish) => {
    setSelectedDish(dish ?? null);
    setDishForm(
      dish
        ? {
            name: dish.name,
            description: dish.description,
            price: String(dish.price),
            photo_url: dish.photo_url ?? "",
          }
          : { name: "", description: "", price: "", photo_url: "" },
    );
    setDishModal(dish ? "edit" : "add");
  };
  const saveDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSavingDish) return;
    const values = {
      name: dishForm.name.trim(),
      description: dishForm.description.trim(),
      price: Number(dishForm.price),
      image_url: dishForm.photo_url,
    };
    if (
      !values.name ||
      !dishForm.price.trim() ||
      !Number.isFinite(values.price) ||
      values.price < 0
    ) {
      setError("Veuillez renseigner le nom du plat et un prix valide.");
      return;
    }
    setError(null);
    setIsSavingDish(true);
    try {
      const photoInput = event.currentTarget.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement | null;
      const photoFile = photoInput?.files?.[0];
      if (photoFile) {
        values.image_url = await readOptimizedImage(photoFile);
      }
      if (supabase && currentRestaurant) {
        const menu = menuId
          ? { id: menuId }
          : await ensureRestaurantMenu(currentRestaurant.id);
        if (!menu) throw new Error("menu principal indisponible");
        if (!menuId) setMenuId(menu.id);
        if (dishModal === "edit" && selectedDish) {
          const { error: updateError } = await supabase
            .from("menu_items")
            .update({ ...values })
            .eq("id", selectedDish.id)
            .eq("menu_id", menu.id);
          if (updateError) {
            setError(`Modification du plat impossible : ${updateError.message}`);
            return;
          }
          setDishes((current) =>
            current.map((dish) =>
              dish.id === selectedDish.id
                ? { ...dish, ...values, photo_url: values.image_url }
                : dish,
            ),
          );
        } else {
          const { data, error: insertError } = await supabase
            .from("menu_items")
            .insert({ ...values, menu_id: menu.id, is_available: true })
            .select("id, name, description, price, image_url, is_available")
            .single();
          if (insertError || !data) {
            setError(
              `Ajout du plat impossible : ${insertError?.message ?? "réponse Supabase vide"}`,
            );
            return;
          }
          setDishes((current) => [
            ...current,
            {
              id: data.id,
              menuId: menu.id,
              name: data.name,
              description: data.description ?? "",
              price: Number(data.price),
              photo_url: data.image_url ?? values.image_url,
              available: data.is_available,
              today: false,
            },
          ]);
        }
      } else if (dishModal === "edit" && selectedDish) {
        setDishes((current) =>
          current.map((dish) =>
            dish.id === selectedDish.id
              ? { ...dish, ...values, photo_url: values.image_url }
              : dish,
          ),
        );
      } else {
        setDishes((current) => [
          ...current,
          {
            ...values,
            id: Date.now(),
            photo_url: values.image_url,
            available: true,
            today: false,
          },
        ]);
      }
      setDishModal(null);
    } catch (saveError) {
      setError(
        `Enregistrement du plat impossible : ${saveError instanceof Error ? saveError.message : "erreur inconnue"}`,
      );
    } finally {
      setIsSavingDish(false);
    }
  };
  const toggleDish = async (dish: Dish) => {
    const available = !dish.available;
    if (supabase && dish.menuId) {
      const { error: updateError } = await supabase
        .from("menu_items")
        .update({ is_available: available })
        .eq("id", dish.id)
        .eq("menu_id", dish.menuId);
      if (updateError) {
        setError(
          `Disponibilité impossible à modifier : ${updateError.message}`,
        );
        return;
      }
    }
    setDishes((current) =>
      current.map((item) =>
        item.id === dish.id ? { ...item, available } : item,
      ),
    );
  };
  const toggleToday = async (dish: Dish) => {
    if (supabase && currentRestaurant && dish.menuId) {
      const today = new Date().toISOString().slice(0, 10);
      if (dish.today) {
        const { error: deleteError } = await supabase
          .from("restaurant_menu_days")
          .delete()
          .eq("restaurant_id", currentRestaurant.id)
          .eq("menu_item_id", dish.id)
          .eq("menu_date", today);
        if (deleteError) {
          setError(
            `Retrait du menu du jour impossible : ${deleteError.message}`,
          );
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("restaurant_menu_days")
          .insert({
            restaurant_id: currentRestaurant.id,
            menu_item_id: dish.id,
            menu_date: today,
          });
        if (insertError) {
          setError(`Ajout au menu du jour impossible : ${insertError.message}`);
          return;
        }
      }
    }
    setDishes((current) =>
      current.map((item) =>
        item.id === dish.id ? { ...item, today: !item.today } : item,
      ),
    );
  };
  const deleteDish = async (dish: Dish) => {
    if (!window.confirm(`Supprimer ${dish.name} ?`)) return;
    if (supabase && dish.menuId) {
      const { error: deleteError } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", dish.id)
        .eq("menu_id", dish.menuId);
      if (deleteError) {
        setError(`Suppression du plat impossible : ${deleteError.message}`);
        return;
      }
    }
    setDishes((current) => current.filter((item) => item.id !== dish.id));
  };
  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNav(false);
  };
  const openRestaurantProfile = () => {
    if (currentRestaurant) {
      openDetails(currentRestaurant);
      return;
    }
    scrollToSection("restaurant-identity");
  };

  if (showRestaurateur && isAuthenticated) {
    const restaurateur = currentRestaurant ?? restaurants[0];
    const todayDishes = dishes.filter((dish) => dish.today);
    const activeOrders = restaurantOrders.filter(
      (order) => order.status !== "Livrée" && order.status !== "Annulée",
    );
    const archivedOrders = restaurantOrders.filter(
      (order) => order.status === "Livrée" || order.status === "Annulée",
    );
    const renderOrderCard = (order: RestaurantOrder, isArchived = false) => (
      <article className={`restaurant-order-card ${isArchived ? `restaurant-order-archived restaurant-order-${order.status === "Livrée" ? "delivered" : "cancelled"}` : ""}`} key={order.id}>
        <div className="restaurant-order-heading">
          <div>
            <strong>{`SM-${String(order.id).padStart(4, "0")}`}</strong>
            <span>{new Date(order.created_at).toLocaleString("fr-FR")}</span>
          </div>
          {isArchived ? (
            <span className={`order-status-label order-status-${order.status === "Livrée" ? "delivered" : "cancelled"}`}>
              {order.status}
            </span>
          ) : (
            <div className="order-status-actions">
              <select
                className="active-order-status-select"
                value={order.status}
                onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                aria-label={`Étape de la commande SM-${String(order.id).padStart(4, "0")}`}
              >
                {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="restaurant-order-details">
          <div><span>Client</span><strong>{order.customer_name}</strong></div>
          <div><span>Téléphone</span><strong>{order.customer_phone}</strong></div>
          <div><span>Paiement</span><strong>{order.payment_method === "wave" ? "Wave" : "Paiement sur place"}</strong></div>
          <div><span>Livraison</span><strong>{order.delivery_address ? order.delivery_address : "À retirer sur place"}</strong></div>
          {order.notes && <div className="restaurant-order-note"><span>Note du client</span><strong>{order.notes}</strong></div>}
        </div>
        <div className="restaurant-order-total">Total : <strong>{order.total_amount.toLocaleString("fr-FR")} FCFA</strong></div>
      </article>
    );
    if (restaurantPage === "dashboard") {
      const confirmedOrders = restaurantOrders.filter((order) => order.status === "Confirmée");
      const deliveredOrders = restaurantOrders.filter((order) => order.status === "Livrée");
      const cancelledOrders = restaurantOrders.filter((order) => order.status === "Annulée");
      const confirmedRevenue = confirmedOrders.reduce((total, order) => total + order.total_amount, 0);
      const paidDebtRevenue = restaurantDebts.filter((debt) => debt.status === "Payée").reduce((total, debt) => total + debt.amount, 0);
      const turnover = confirmedRevenue + paidDebtRevenue;
      const chartDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return date;
      });
      const chartValues = chartDays.map((date) => {
        const dayKey = date.toISOString().slice(0, 10);
        return restaurantOrders.filter((order) => order.created_at.slice(0, 10) === dayKey).length;
      });
      const chartMax = Math.max(...chartValues, 1);
      const chartPoints = chartValues.map((value, index) => `${18 + (index * 604) / 6},${188 - (value / chartMax) * 148}`).join(" ");
      return (
        <main className="restaurant-space">
          <header className="restaurant-topbar"><div className="brand"><span className="brand-mark"><Store size={19} /></span><span>MENU RESTAURANT SOKONE</span></div><button className="restaurant-logout-button" onClick={handleLogout}>Se déconnecter</button></header>
          <div className="restaurant-layout">
            <aside className="restaurant-nav">
              <div className="workspace-label">ESPACE RESTAURATEUR</div>
              <button className="restaurant-nav-item restaurant-nav-active" onClick={() => setRestaurantPage("dashboard")}><LayoutDashboard size={18} /> Tableau de bord</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("menu")}><Utensils size={18} /> Mon menu</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("orders")}><ShoppingBag size={18} /> Commande {activeOrders.length > 0 && <span className="orders-notification-badge">{activeOrders.length}</span>}</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("expenses")}><WalletCards size={18} /> Dépenses</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("debts")}><WalletCards size={18} /> Dettes</button>
              <button className="restaurant-nav-item restaurant-back-admin" onClick={() => setShowRestaurateur(false)}><LayoutDashboard size={18} /> Retour administration</button>
            </aside>
            <section className="restaurant-content restaurant-dashboard-content">
              <div className="page-heading"><div><div className="eyebrow">ESPACE RESTAURATEUR</div><h1>Tableau de bord</h1><p>Suivez l’activité de votre restaurant en un coup d’œil.</p></div><div className="dashboard-refresh"><Activity size={15} /> Mis à jour automatiquement</div></div>
              {error && <div className="notice notice-warning" role="alert">{error}</div>}
              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card dashboard-stat-revenue"><div className="dashboard-stat-icon"><CircleDollarSign size={20} /></div><div><span>Chiffre d’affaires</span><strong>{turnover.toLocaleString("fr-FR")} FCFA</strong><small>Commandes confirmées + dettes réglées</small></div></div>
                <div className="dashboard-stat-card"><div className="dashboard-stat-icon"><ClipboardList size={20} /></div><div><span>Nombre de commandes</span><strong>{restaurantOrders.length}</strong><small>Toutes les commandes reçues</small></div></div>
                <div className="dashboard-stat-card dashboard-stat-confirmed"><div className="dashboard-stat-icon"><TrendingUp size={20} /></div><div><span>Commandes livrées</span><strong>{deliveredOrders.length}</strong><small>{deliveredOrders.reduce((total, order) => total + order.total_amount, 0).toLocaleString("fr-FR")} FCFA livrés</small></div></div>
                <div className="dashboard-stat-card dashboard-stat-cancelled"><div className="dashboard-stat-icon"><X size={20} /></div><div><span>Commandes annulées</span><strong>{cancelledOrders.length}</strong><small>Commandes non finalisées</small></div></div>
              </div>
              <section className="dashboard-chart-panel"><div className="dashboard-panel-heading"><div><h2>Croissance des commandes</h2><p>Nombre de commandes reçues sur les 7 derniers jours.</p></div><BarChart3 size={21} /></div><div className="orders-chart"><svg viewBox="0 0 640 220" role="img" aria-label="Courbe de croissance des commandes"><line x1="18" y1="188" x2="622" y2="188" className="chart-axis" /><polyline points={chartPoints} className="chart-line" /><polygon points={`18,188 ${chartPoints} 622,188`} className="chart-area" />{chartValues.map((value, index) => { const x = 18 + (index * 604) / 6; const y = 188 - (value / chartMax) * 148; return <g key={chartDays[index].toISOString()}><circle cx={x} cy={y} r="4" className="chart-point" /><text x={x} y="210" textAnchor="middle" className="chart-label">{chartDays[index].toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</text><text x={x} y={Math.max(y - 10, 14)} textAnchor="middle" className="chart-value">{value}</text></g>; })}</svg></div></section>
            </section>
          </div>
        </main>
      );
    }
    if (restaurantPage === "debts") {
      const unpaidDebts = restaurantDebts.filter((debt) => debt.status === "À payer");
      const paidDebts = restaurantDebts.filter((debt) => debt.status === "Payée");
      const unpaidTotal = unpaidDebts.reduce((total, debt) => total + debt.amount, 0);
      const renderDebtItem = (debt: RestaurantDebt, isHistory = false) => (
        <article className={`expense-item debt-item ${isHistory ? "debt-paid" : "debt-unpaid"}`} key={debt.id}>
          <div className="debt-item-main">
            <strong>{debt.creditor}</strong>
            <span>{debt.debt_type} · {new Date(`${debt.debt_date}T12:00:00`).toLocaleDateString("fr-FR")}</span>
            {debt.description && <small>{debt.description}</small>}
            {isHistory && debt.paid_at && <small className="debt-paid-date">Réglée le {new Date(debt.paid_at).toLocaleDateString("fr-FR")}</small>}
          </div>
          <div className="debt-item-right">
            <b>{debt.amount.toLocaleString("fr-FR")} FCFA</b>
            {!isHistory && <button type="button" className="debt-status-button" onClick={() => updateDebtStatus(debt.id, "Payée")}>Marquer payée</button>}
          </div>
        </article>
      );
      return (
        <main className="restaurant-space">
          <header className="restaurant-topbar"><div className="brand"><span className="brand-mark"><Store size={19} /></span><span>MENU RESTAURANT SOKONE</span></div><button className="restaurant-logout-button" onClick={handleLogout}>Se déconnecter</button></header>
          <div className="restaurant-layout">
            <aside className="restaurant-nav">
              <div className="workspace-label">ESPACE RESTAURATEUR</div>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("dashboard")}><LayoutDashboard size={18} /> Tableau de bord</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("menu")}><Utensils size={18} /> Mon menu</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("orders")}><ShoppingBag size={18} /> Commande {activeOrders.length > 0 && <span className="orders-notification-badge">{activeOrders.length}</span>}</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("expenses")}><WalletCards size={18} /> Dépenses</button>
              <button className="restaurant-nav-item restaurant-nav-active"><History size={18} /> Dettes</button>
              <button className="restaurant-nav-item restaurant-back-admin" onClick={() => setShowRestaurateur(false)}><LayoutDashboard size={18} /> Retour administration</button>
            </aside>
            <section className="restaurant-content restaurant-expenses-page-content">
              <div className="page-heading"><div><div className="eyebrow">ESPACE RESTAURATEUR</div><h1>Dettes</h1><p>Gardez une vue claire sur ce qui reste à régler et ce qui est déjà soldé.</p></div><div className="debt-page-actions"><div className="expense-total-card debt-total-card"><span>Total à payer</span><strong>{unpaidTotal.toLocaleString("fr-FR")} FCFA</strong><small>{unpaidDebts.length} dette{unpaidDebts.length > 1 ? "s" : ""} en cours</small></div><button type="button" className="secondary-button debt-history-button" onClick={() => setDebtHistoryOpen(true)}><History size={16} /> Historique des dettes <span>{paidDebts.length}</span></button></div></div>
              {error && <div className="notice notice-warning" role="alert">{error}</div>}
              <div className="expenses-layout debts-layout">
                <form className="expense-form-panel" onSubmit={saveDebt}>
                  <h2>Nouvelle dette</h2>
                  <label>Créancier<input value={debtForm.creditor} onChange={(event) => setDebtForm((current) => ({ ...current, creditor: event.target.value }))} placeholder="Nom du fournisseur ou de la personne" required /></label>
                  <fieldset className="debt-type-fieldset">
                    <legend>Type de dette</legend>
                    <label className="debt-type-option"><input type="checkbox" checked={debtForm.debt_type === "Je dois"} onChange={() => setDebtForm((current) => ({ ...current, debt_type: "Je dois" }))} /> <span>Je dois</span></label>
                    <label className="debt-type-option"><input type="checkbox" checked={debtForm.debt_type === "On me doit"} onChange={() => setDebtForm((current) => ({ ...current, debt_type: "On me doit" }))} /> <span>On me doit</span></label>
                  </fieldset>
                  <label>Montant (FCFA)<input type="number" min="1" step="1" value={debtForm.amount} onChange={(event) => setDebtForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
                  <label>Description <span>(facultatif)</span><textarea value={debtForm.description} onChange={(event) => setDebtForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
                  <button className="primary-button" type="submit" disabled={isSavingDebt}>{isSavingDebt ? "Enregistrement..." : "Enregistrer la dette"}</button>
                </form>
                <div className="debt-lists">
                  <div className="expenses-list-panel debt-list-panel"><div className="debt-list-heading"><div><h2>À régler</h2><p>Les dettes encore ouvertes apparaissent ici.</p></div><span>{unpaidDebts.length}</span></div>{isDebtsLoading ? <LoadingIndicator label="Chargement des dettes..." /> : unpaidDebts.length ? unpaidDebts.map((debt) => renderDebtItem(debt)) : <p className="empty-state">Aucune dette à régler.</p>}</div>
                </div>
              </div>
              {debtHistoryOpen && <div className="modal-backdrop" role="presentation"><div className="modal-card debt-history-modal" role="dialog" aria-modal="true" aria-labelledby="debt-history-title"><div className="modal-header"><div><div className="eyebrow">ARCHIVES</div><h2 id="debt-history-title">Historique des dettes</h2></div><button className="close-button" type="button" onClick={() => setDebtHistoryOpen(false)} aria-label="Fermer"><X size={20} /></button></div><div className="debt-history-modal-body">{isDebtsLoading ? <LoadingIndicator label="Chargement de l’historique..." /> : paidDebts.length ? paidDebts.map((debt) => renderDebtItem(debt, true)) : <p className="empty-state">Aucune dette payée pour le moment.</p>}</div></div></div>}
            </section>
          </div>
        </main>
      );
    }
    if (restaurantPage === "expenses") {
      const totalExpenses = restaurantExpenses.reduce((total, expense) => total + expense.amount, 0);
      return (
        <main className="restaurant-space">
          <header className="restaurant-topbar">
            <div className="brand"><span className="brand-mark"><Store size={19} /></span><span>MENU RESTAURANT SOKONE</span></div>
            <button className="restaurant-logout-button" onClick={handleLogout} title="Se déconnecter">Se déconnecter</button>
          </header>
          <div className="restaurant-layout">
            <aside className="restaurant-nav">
              <div className="workspace-label">ESPACE RESTAURATEUR</div>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("dashboard")}><LayoutDashboard size={18} /> Tableau de bord</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("menu")}><Utensils size={18} /> Mon menu</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("orders")}><ShoppingBag size={18} /> Commande {activeOrders.length > 0 && <span className="orders-notification-badge">{activeOrders.length}</span>}</button>
              <button className="restaurant-nav-item restaurant-nav-active"><WalletCards size={18} /> Dépenses</button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("debts")}><WalletCards size={18} /> Dettes</button>
              <button className="restaurant-nav-item restaurant-back-admin" onClick={() => setShowRestaurateur(false)}><LayoutDashboard size={18} /> Retour administration</button>
            </aside>
            <section className="restaurant-content restaurant-expenses-page-content">
              <div className="page-heading">
                <div><div className="eyebrow">ESPACE RESTAURATEUR</div><h1>Dépenses</h1><p>Enregistrez et suivez les dépenses de votre restaurant.</p></div>
                <div className="expense-total-card"><span>Total des dépenses</span><strong>{totalExpenses.toLocaleString("fr-FR")} FCFA</strong></div>
              </div>
              {error && <div className="notice notice-warning" role="alert">{error}</div>}
              <div className="expenses-layout">
                <form className="expense-form-panel" onSubmit={saveExpense}>
                  <h2>Nouvelle dépense</h2>
                  <label>Catégorie<select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}><option>Achats</option><option>Salaires</option><option>Loyer</option><option>Électricité</option><option>Transport</option><option>Autre</option></select></label>
                  <label>Montant (FCFA)<input type="number" min="1" step="1" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
                  <label>Description <span>(facultatif)</span><textarea value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
                  <button className="primary-button" type="submit" disabled={isSavingExpense}>{isSavingExpense ? "Enregistrement..." : "Enregistrer la dépense"}</button>
                </form>
                <div className="expenses-list-panel">
                  <h2>Dernières dépenses</h2>
                  {isExpensesLoading ? <LoadingIndicator label="Chargement des dépenses..." /> : restaurantExpenses.length ? restaurantExpenses.map((expense) => (
                    <article className="expense-item" key={expense.id}>
                      <div><strong>{expense.category}</strong><span>{new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString("fr-FR")}</span>{expense.description && <small>{expense.description}</small>}</div>
                      <b>{expense.amount.toLocaleString("fr-FR")} FCFA</b>
                    </article>
                  )) : <p className="empty-state">Aucune dépense enregistrée.</p>}
                </div>
              </div>
            </section>
          </div>
        </main>
      );
    }
    if (restaurantPage === "orders") {
      return (
        <main className="restaurant-space">
          <header className="restaurant-topbar">
            <div className="brand">
              <span className="brand-mark"><Store size={19} /></span>
              <span>MENU RESTAURANT SOKONE</span>
            </div>
            <button className="restaurant-logout-button" onClick={handleLogout} title="Se déconnecter">
              Se déconnecter
            </button>
          </header>
          <div className="restaurant-layout">
            <aside className="restaurant-nav">
              <div className="workspace-label">ESPACE RESTAURATEUR</div>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("dashboard")}>
                <LayoutDashboard size={18} /> Tableau de bord
              </button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("menu")}>
                <Utensils size={18} /> Mon menu
              </button>
              <button className="restaurant-nav-item restaurant-nav-active">
                <ShoppingBag size={18} /> Commande {activeOrders.length > 0 && <span className="orders-notification-badge">{activeOrders.length}</span>}
              </button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("expenses")}>
                <WalletCards size={18} /> Dépenses
              </button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("debts")}>
                <WalletCards size={18} /> Dettes
              </button>
              <button className="restaurant-nav-item restaurant-back-admin" onClick={() => setShowRestaurateur(false)}>
                <LayoutDashboard size={18} /> Retour administration
              </button>
            </aside>
            <section className="restaurant-content restaurant-orders-page-content">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ESPACE RESTAURATEUR</div>
                  <h1>Commande</h1>
                  <p>Consultez et mettez à jour les commandes de vos clients.</p>
                </div>
                <div className="orders-page-actions">
                  <strong className="orders-count">{activeOrders.length} commande{activeOrders.length > 1 ? "s" : ""}</strong>
                  <button className="secondary-button history-button" type="button" onClick={() => setOrderHistoryOpen(true)}>
                    <History size={16} /> Historique des commandes
                  </button>
                </div>
              </div>
              {error && <div className="notice notice-warning" role="alert">{error}</div>}
              <div className="orders-management-page-panel">
                {isOrdersLoading ? (
                  <LoadingIndicator label="Chargement des commandes..." />
                ) : activeOrders.length ? (
                  <div className="restaurant-orders-list">
                    {activeOrders.map((order) => renderOrderCard(order))}
                  </div>
                ) : (
                  <p className="empty-state">Aucune commande reçue pour le moment.</p>
                )}
              </div>
            </section>
            {orderHistoryOpen && (
              <div className="orders-history-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOrderHistoryOpen(false)}>
                <div className="orders-history-modal" role="dialog" aria-modal="true" aria-labelledby="order-history-title">
                  <div className="orders-history-header">
                    <div>
                      <div className="eyebrow">ARCHIVES</div>
                      <h2 id="order-history-title">Historique des commandes</h2>
                    </div>
                    <button className="close-button" type="button" onClick={() => setOrderHistoryOpen(false)} aria-label="Fermer">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="orders-history-body">
                    {archivedOrders.length ? archivedOrders.map((order) => renderOrderCard(order, true)) : (
                      <p className="empty-state">Aucune commande livrée ou annulée.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      );
    }
    return (
      <main className="restaurant-space">
        <header className="restaurant-topbar">
          <div className="brand">
            <span className="brand-mark">
              <Store size={19} />
            </span>
            <span>
              MENU RESTAURANT SOKONE
            </span>
          </div>
          <div className="restaurant-top-actions">
            <button
              className="restaurant-logout-button"
              onClick={handleLogout}
              title="Se déconnecter"
            >
              Se déconnecter
            </button>
          </div>
        </header>
        <div className="restaurant-layout">
          <aside className="restaurant-nav">
            <div className="workspace-label">ESPACE RESTAURATEUR</div>
            <button className="restaurant-nav-item" onClick={() => setRestaurantPage("dashboard")}>
              <LayoutDashboard size={18} /> Tableau de bord
            </button>
            <button className="restaurant-nav-item restaurant-nav-active" onClick={() => scrollToSection("my-menu")}>
              <Utensils size={18} /> Mon menu
            </button>
            <button className="restaurant-nav-item" onClick={() => setRestaurantPage("orders")}>
              <ShoppingBag size={18} /> Commande {activeOrders.length > 0 && <span className="orders-notification-badge">{activeOrders.length}</span>}
            </button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("expenses")}>
                <WalletCards size={18} /> Dépenses
              </button>
              <button className="restaurant-nav-item" onClick={() => setRestaurantPage("debts")}>
                <WalletCards size={18} /> Dettes
              </button>
            <button
              className="restaurant-nav-item restaurant-back-admin"
              onClick={() => setShowRestaurateur(false)}
            >
              <LayoutDashboard size={18} /> Retour administration
            </button>
          </aside>
          <section className="restaurant-content">
            <div className="page-heading" id="restaurant-dashboard">
              <div>
                <div className="eyebrow">ESPACE RESTAURATEUR</div>
                <h1>
                  Bonjour, {restaurateur.name} <span>👋</span>
                </h1>
                <p>Gérez vos plats et composez votre menu du jour.</p>
              </div>
              <button className="primary-button" onClick={() => openDishForm()}>
                <Plus size={18} /> Ajouter un plat
              </button>
            </div>
            {error && <div className="notice notice-warning" role="alert">{error}</div>}
            <section className="restaurant-identity">
              <div className="restaurant-cover">
                {restaurateur.photo_url && (
                  <img src={restaurateur.photo_url} alt={`Photo de ${restaurateur.name}`} />
                )}
              </div>
              <div className="restaurant-identity-info">
                <div>
                  <h2>{restaurateur.name}</h2>
                  <p>
                    <MapPin size={14} /> {restaurateur.address}
                  </p>
                  <p>
                    <Phone size={14} /> {restaurateur.phone}
                  </p>
                </div>
                <span className={`status-pill status-${restaurateur.status}`}>
                  {restaurateur.status === "active" ? "Ouvert" : "Fermé"}
                </span>
                <button className="secondary-button status-toggle-button" onClick={() => toggleStatus(restaurateur)}>
                  <Store size={15} /> {restaurateur.status === "active" ? "Fermer" : "Ouvrir"}
                </button>
              </div>
            </section>
            <section className="stats-grid restaurant-stats">
              <div className="stat-card">
                <div className="stat-icon stat-icon-purple">
                  <Utensils size={20} />
                </div>
                <div>
                  <span>Nombre de plats</span>
                  <strong>{dishes.length}</strong>
                  <small className="muted-stat">Dans votre catalogue</small>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-green">
                  <Check size={20} />
                </div>
                <div>
                  <span>Plats disponibles</span>
                  <strong>
                    {dishes.filter((dish) => dish.available).length}
                  </strong>
                  <small className="muted-stat">Prêts à commander</small>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-amber">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <span>Menu du jour</span>
                  <strong>{todayDishes.length}</strong>
                  <small className="muted-stat">
                    Plats affichés aujourd’hui
                  </small>
                </div>
              </div>
            </section>
            <section className="space-panel" id="my-menu">
              <div className="section-heading">
                <div>
                  <h2>Mon menu</h2>
                  <p>
                    Tous vos plats, qu’ils soient affichés aujourd’hui ou non.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => openDishForm()}
                >
                  <Plus size={17} /> Ajouter un plat
                </button>
              </div>
              <div className="dish-list">
                {isDishesLoading ? (
                  <LoadingIndicator label="Chargement des plats..." />
                ) : dishes.length ? dishes.map((dish) => (
                  <article className={`dish-row ${dish.today ? "dish-row-in-today" : ""}`} key={dish.id}>
                    <div className="dish-image">
                      {dish.photo_url ? (
                        <img src={dish.photo_url} alt={`Photo de ${dish.name}`} />
                      ) : (
                        <Utensils size={22} />
                      )}
                    </div>
                    <div className="dish-main">
                      <div className="dish-heading">
                        <h3>{dish.name}</h3>
                        <strong>{dish.price.toLocaleString("fr-FR")} FCFA</strong>
                      </div>
                      <p>{dish.description}</p>
                    </div>
                    <div className="row-actions">
                      <button
                        className="availability-button"
                        onClick={() => toggleToday(dish)}
                        disabled={dish.today}
                      >
                        Disponible
                      </button>
                      <div className="dish-icon-actions">
                        <button
                          onClick={() => openDishForm(dish)}
                          aria-label="Modifier"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="danger-action"
                          onClick={() => deleteDish(dish)}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                )) : <p className="empty-state">Aucun plat enregistré dans ce menu.</p>}
              </div>
            </section>
            <section className="space-panel today-menu-panel" id="today-menu">
              <div className="section-heading">
                <div>
                  <h2>Menu du jour</h2>
                  <p>
                    Seuls les plats disponibles et sélectionnés sont visibles
                    par vos clients.
                  </p>
                </div>
                <span className="today-date">
                  <CalendarDays size={15} /> Aujourd’hui
                </span>
              </div>
              <div className="today-preview">
                {isDishesLoading ? (
                  <LoadingIndicator label="Chargement du menu du jour..." />
                ) : todayDishes.length ? (
                  todayDishes.map((dish) => (
                    <div className="today-item" key={dish.id}>
                      <div className="today-dish-image">
                        {dish.photo_url ? (
                          <img src={dish.photo_url} alt={`Photo de ${dish.name}`} />
                        ) : (
                          <Utensils size={20} />
                        )}
                      </div>
                      <div className="today-dish-main">
                        <div className="dish-heading">
                          <strong>{dish.name}</strong>
                          <b>{dish.price.toLocaleString("fr-FR")} FCFA</b>
                        </div>
                        <span>{dish.description}</span>
                      </div>
                      <div className="today-actions">
                        <button
                          className={dish.available ? "" : "today-action-active"}
                          onClick={() => toggleDish(dish)}
                        >
                          {dish.available ? "Rupture" : "Disponible"}
                        </button>
                        <button
                          className="icon-action danger-action"
                          onClick={() => toggleToday(dish)}
                          aria-label={`Retirer ${dish.name} du menu du jour`}
                          title="Retirer du menu du jour"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">
                    Aucun plat n’est affiché aujourd’hui.
                  </p>
                )}
              </div>
            </section>
          </section>
        </div>
        {dishModal && (
          <div className="modal-backdrop" role="presentation">
            <div className="modal-card" role="dialog" aria-modal="true">
              <div className="modal-header">
                <div>
                  <div className="eyebrow">MON MENU</div>
                  <h2>
                    {dishModal === "add"
                      ? "Ajouter un plat"
                      : "Modifier un plat"}
                  </h2>
                </div>
                <button
                  className="close-button"
                  onClick={() => setDishModal(null)}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={saveDish}>
                <div className="form-grid">
                  <label>
                    Nom du plat *
                    <input
                      required
                      value={dishForm.name}
                      onChange={(event) =>
                        setDishForm({ ...dishForm, name: event.target.value })
                      }
                      placeholder="Ex. Thiéboudienne"
                    />
                  </label>
                  <label>
                    Prix *
                    <input
                      required
                      min="0"
                      type="number"
                      value={dishForm.price}
                      onChange={(event) =>
                        setDishForm({ ...dishForm, price: event.target.value })
                      }
                      placeholder="2500"
                    />
                  </label>
                  <label className="full-label">
                    Description
                    <textarea
                      value={dishForm.description}
                      onChange={(event) =>
                        setDishForm({
                          ...dishForm,
                          description: event.target.value,
                        })
                      }
                      placeholder="Décrivez votre plat"
                    />
                  </label>
                  <label>
                    Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          setDishForm((current) => ({
                            ...current,
                            photo_url: String(reader.result),
                          }));
                        reader.readAsDataURL(file);
                      }}
                    />
                    {dishForm.photo_url && (
                      <img
                        className="dish-upload-preview"
                        src={dishForm.photo_url}
                        alt="Aperçu du plat"
                      />
                    )}
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setDishModal(null)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="primary-button" disabled={isSavingDish}>
                    {isSavingDish ? "Enregistrement..." : "Enregistrer le plat"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (showLogin) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="brand login-brand">
            <span className="brand-mark">
              <Store size={19} />
            </span>
            <span>
              Sokone<span className="brand-dot">.</span>
            </span>
          </div>
          <div className="login-heading">
            <div className="login-icon">
              <LogIn size={21} />
            </div>
            <div>
              <div className="eyebrow">ESPACE ADMIN</div>
              <h1>Connexion</h1>
              <p>Connectez-vous pour accéder à votre tableau de bord.</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="votre@email.com"
              />
            </label>
            <label>
              Mot de passe
              <input
                required
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Votre mot de passe"
              />
            </label>
            {loginError && (
              <p className="login-error" role="alert">
                {loginError}
              </p>
            )}
            <button type="submit" className="primary-button login-submit">
              <LogIn size={17} /> Se connecter
            </button>
          </form>
          <button
            className="back-home-button"
            onClick={() => setShowLogin(false)}
          >
            Retour à l’accueil
          </button>
        </div>
      </main>
    );
  }

  if (showOrders) {
    return (
      <main className="orders-page">
        <header className="orders-page-header">
          <button className="orders-back-button" type="button" onClick={() => setShowOrders(false)}>
            <ChevronDown size={18} /> Accueil
          </button>
          <div className="orders-page-brand">MENU RESTAURANT SOKONE</div>
          <span aria-hidden="true" />
        </header>
        <section className="orders-page-content">
          {orderNumber && (
            <div className="order-confirmation" role="status">
              <div className="order-confirmation-icon"><Check size={22} /></div>
              <div>
                <h1>Commande enregistrée !</h1>
                <p>Votre numéro de commande est :</p>
                <div className="order-number-row">
                  <strong>{orderNumber}</strong>
                  <button type="button" onClick={copyOrderNumber} aria-label="Copier le numéro de commande">
                    <Copy size={14} /> {numberCopied ? "Copié" : "Copier"}
                  </button>
                </div>
                <span>Gardez ce numéro ou copiez-le pour suivre votre commande plus tard.</span>
              </div>
            </div>
          )}
          <div className="order-tracking-panel">
            <div className="eyebrow text-orange-500">SUIVI DE COMMANDE</div>
            <h2>Retrouvez votre commande</h2>
            <p>Entrez votre numéro de commande et le téléphone utilisé pour vérifier son état.</p>
            <form className="tracking-form" onSubmit={trackOrder}>
              <label>
                Entrez votre numéro de commande
                <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Exemple : SM-2847" required />
              </label>
              <label>
                Numéro de téléphone
                <input type="tel" inputMode="numeric" autoComplete="tel" value={trackingPhone} onChange={(event) => setTrackingPhone(event.target.value.replace(/[^0-9 ]/g, ""))} placeholder="7X XXX XX XX" pattern="7[0-9](?: ?[0-9]){7}" title="Entrez le numéro utilisé lors de la commande" required />
              </label>
              <button className="order-submit-button" type="submit" disabled={trackingLoading || !supabase}>
                {trackingLoading ? "Recherche..." : "Suivre la commande"}
              </button>
            </form>
            {trackingError && <p className="order-error">{trackingError}</p>}
            {trackedOrder && (
              <div className="tracked-order-result tracked-order-details">
                <div className="tracked-order-restaurant"><span>Restaurant</span><strong>{trackedOrder.restaurantName}</strong></div>
                <div><span>Commande</span><strong>{`SM-${String(trackedOrder.id).padStart(4, "0")}`}</strong></div>
                <div><span>Statut</span><strong className="tracked-order-status">{trackedOrder.status}</strong></div>
                <div><span>Total</span><strong>{trackedOrder.total_amount.toLocaleString("fr-FR")} FCFA</strong></div>
                <section className="tracked-order-items"><h3>Détails de la commande</h3>{trackedOrder.items.length ? trackedOrder.items.map((item, index) => <div className="tracked-order-item" key={`${item.name}-${index}`}><strong>{item.quantity} × {item.name}</strong><b>{(item.quantity * item.unit_price).toLocaleString("fr-FR")} FCFA</b></div>) : <p>Aucun détail disponible pour cette commande.</p>}{trackedOrder.notes && <div className="tracked-order-note"><span>Note</span><p>{trackedOrder.notes}</p></div>}</section>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (showHome) {
    return (
      <main className="min-h-screen bg-[#fffaf6] text-slate-800">
        <header className="flex items-center justify-between border-b border-orange-100 bg-white px-6 py-5 sm:px-12">
          <div className="flex items-center gap-3 font-[Manrope] text-[10px] font-extrabold text-slate-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white">
              <Store size={19} />
            </span>
            MENU RESTAURANT SOKONE
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                className="icon-button home-action"
                onClick={handleLogout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut size={19} />
              </button>
              <button
                className="secondary-button"
                onClick={() => setShowHome(false)}
              >
                <LayoutDashboard size={16} /> Espace admin
              </button>
            </div>
          ) : null}
        </header>
        <section className="mx-auto max-w-6xl px-6 pb-28 pt-8 sm:px-12 sm:pt-12">
          <div className="max-w-2xl">
            <p className="eyebrow text-orange-500">BIENVENUE À SOKONE</p>
            <h1 className="mt-2 font-[Manrope] text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
              Vous cherchez quoi manger aujourd’hui ?
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Découvrez les restaurants de Sokone, leurs menus du jour et les
              plats disponibles près de vous.
            </p>
          </div>
          <div id="home-restaurants" className="home-restaurant-grid mt-8 grid gap-5 sm:grid-cols-2">
            {isLoading ? (
              <LoadingIndicator label="Chargement des restaurants..." />
            ) : restaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  className="home-restaurant-card overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="restaurant-public-image">
                    {restaurant.photo_url ? (
                      <img
                        src={restaurant.photo_url}
                        alt={`Photo de ${restaurant.name}`}
                      />
                    ) : (
                      <Store className="text-orange-500" size={38} />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-[Manrope] text-lg font-bold text-slate-900">
                        {restaurant.name}
                      </h2>
                      <span className={`status-pill status-${restaurant.status}`}>
                        {restaurant.status === "active" ? "Ouvert" : "Fermé"}
                      </span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} />
                      {restaurant.address}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone size={14} />
                      {restaurant.phone}
                    </p>
                    <button
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => openPublicMenu(restaurant)}
                      disabled={restaurant.status !== "active"}
                    >
                      {restaurant.status === "active" ? "Voir le menu" : "Menu fermé"} <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
        <nav className="home-bottom-nav" aria-label="Navigation principale">
          <button
            type="button"
            className="home-bottom-nav-button"
            onClick={() => setShowOrders(true)}
            aria-label="Mes commandes"
            title="Mes commandes"
          >
            <ShoppingBag size={21} />
            <span>Mes commandes</span>
          </button>
          <button
            type="button"
            className="home-bottom-nav-button"
            onClick={openLogin}
            aria-label="Se connecter"
            title="Se connecter"
          >
            <UserRound size={21} />
            <span>Connexion</span>
          </button>
        </nav>
        {modal === "details" && selected && (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setModal(null)
            }
          >
            <div className="modal-card" role="dialog" aria-modal="true">
              <div className="modal-header">
                <div>
                  <div className="eyebrow">RESTAURANT</div>
                  <h2>{selected.name}</h2>
                </div>
                <button
                  className="close-button"
                  onClick={() => setModal(null)}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="details-body">
                {selected.photo_url && (
                  <img
                    className="details-photo"
                    src={selected.photo_url}
                    alt={`Photo de ${selected.name}`}
                  />
                )}
                <div className="detail-list">
                  <div>
                    <span>Adresse</span>
                    <strong>{selected.address}</strong>
                  </div>
                  <div>
                    <span>Téléphone</span>
                    <strong>{selected.phone}</strong>
                  </div>
                </div>
                <div className="public-menu">
                  <h3>Menu du restaurant</h3>
                  {isPublicMenuLoading ? (
                    <LoadingIndicator label="Chargement du menu du jour..." />
                  ) : publicMenuDishes.length ? (
                    publicMenuDishes.map((dish) => (
                      <div className="public-menu-item" key={dish.id}>
                        <div className="public-menu-image">
                          {dish.photo_url ? (
                            <img
                              src={dish.photo_url}
                              alt={`Photo de ${dish.name}`}
                            />
                          ) : (
                            <Utensils size={18} />
                          )}
                        </div>
                        <div>
                          <strong>{dish.name}</strong>
                          <span>{dish.description}</span>
                        </div>
                        <div className="public-menu-item-action">
                          <b>{dish.price.toLocaleString("fr-FR")} FCFA</b>
                          <button
                            className="add-to-cart-button"
                            type="button"
                            onClick={() => addToCart(dish)}
                          >
                            <Plus size={14} /> Ajouter
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">
                      Aucun plat n’est affiché aujourd’hui.
                    </p>
                  )}
                </div>
                {cartItems.length > 0 && (
                  <form className="order-panel" onSubmit={submitOrder}>
                    <div className="order-panel-heading">
                      <h3><ShoppingBag size={17} /> Votre commande</h3>
                      <strong>
                        {(cartItems
                          .reduce((total, item) => total + item.price * item.quantity, 0)
                          + (isDeliverySelected ? 500 : 0)).toLocaleString("fr-FR")} FCFA
                      </strong>
                    </div>
                    <div className="order-items">
                      {cartItems.map((item) => (
                        <div className="order-item" key={item.id}>
                          <span>{item.name}</span>
                          <div className="quantity-controls">
                            <button type="button" onClick={() => updateCartQuantity(item.id, -1)} aria-label={`Retirer un ${item.name}`}>
                              <Minus size={13} />
                            </button>
                            <strong>{item.quantity}</strong>
                            <button type="button" onClick={() => updateCartQuantity(item.id, 1)} aria-label={`Ajouter un ${item.name}`}>
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="order-form-grid">
                      <label>
                        Nom complet
                        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
                      </label>
                      <label>
                        Téléphone
                        <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="7X XXX XX XX" pattern="7[0-9](?: ?[0-9]){7}" title="Entrez un numéro de 9 chiffres commençant par 7" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value.replace(/[^0-9 ]/g, ""))} required />
                      </label>
                      <label className="delivery-option">
                        <span className="delivery-option-label">
                          <input
                            type="checkbox"
                            checked={isDeliverySelected}
                            onChange={(event) => setIsDeliverySelected(event.target.checked)}
                          />
                          Livraison à domicile <strong>+500 FCFA</strong>
                        </span>
                      </label>
                      {isDeliverySelected && (
                        <label className="order-address-field">
                          Adresse de livraison
                          <input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} required />
                        </label>
                      )}
                      <label className="order-address-field">
                        Note <span>(facultatif)</span>
                        <textarea value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} maxLength={300} rows={3} placeholder="Exemple : sans oignons, appeler à l’arrivée..." />
                      </label>
                      <fieldset className="payment-fieldset">
                        <legend>Mode de paiement</legend>
                        <label className="payment-option">
                          <input type="radio" name="payment-method" value="wave" checked={paymentMethod === "wave"} onChange={() => setPaymentMethod("wave")} />
                          Wave
                        </label>
                        <label className="payment-option">
                          <input type="radio" name="payment-method" value="sur_place" checked={paymentMethod === "sur_place"} onChange={() => setPaymentMethod("sur_place")} />
                          Paiement sur place
                        </label>
                      </fieldset>
                    </div>
                    {orderError && <p className="order-error">{orderError}</p>}
                    {orderSuccess && <p className="order-success">{orderSuccess}</p>}
                    <button className="order-submit-button" type="submit" disabled={isOrderSubmitting || !supabase}>
                      {isOrderSubmitting ? "Envoi en cours..." : "Confirmer la commande"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Store size={19} />
          </span>
          <span>
            Sokone<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="workspace-label">ESPACE ADMIN</div>
        <nav className="sidebar-nav">
          <button className="nav-item nav-item-active" onClick={() => scrollToSection("admin-dashboard")}>
            <LayoutDashboard size={18} /> Tableau de bord
          </button>
          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("restaurants")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Store size={18} /> Restaurants{" "}
            <span className="nav-count">{restaurants.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setCurrentRestaurant(currentRestaurant ?? restaurants[0] ?? null);
              setShowRestaurateur(true);
            }}
          >
            <Utensils size={18} /> Espace restaurateur
          </button>
          <button className="nav-item" onClick={() => setShowHome(true)}>
            <Home size={18} /> Voir l’accueil
          </button>
          <button className="nav-item" onClick={() => setAdminPanel("settings")}>
            <Settings size={18} /> Paramètres
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setAdminPanel("help")}>
            <CircleHelp size={18} /> Centre d’aide
          </button>
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={18} /> Se déconnecter
          </button>
          <div className="profile-mini">
            <div className="avatar avatar-orange">LF</div>
            <div>
              <strong>Lamine Fall</strong>
              <span>Administrateur</span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>
      <section className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Administration <span>/</span> <strong>Tableau de bord</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" title="Notifications">
              <Bell size={19} />
              <i />
            </button>
            <div className="avatar avatar-dark">LF</div>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SAMEDI 24 AOÛT 2024</div>
              <h1>
                Bonjour, Lamine <span>👋</span>
              </h1>
              <p>Voici ce qui se passe sur votre espace aujourd’hui.</p>
            </div>
            <button className="primary-button" onClick={openAdd}>
              <Plus size={18} /> Ajouter un restaurant
            </button>
          </div>
          {isLoading && <div className="notice">Chargement des données...</div>}
          {error && <div className="notice notice-warning">{error}</div>}
          {adminPanel && (
            <div className="notice">
              {adminPanel === "settings" ? "Les paramètres sont prêts à être configurés." : "Centre d’aide : utilisez les actions des restaurants et des menus pour gérer votre espace."}
              <button className="text-button" onClick={() => setAdminPanel(null)}>Fermer</button>
            </div>
          )}
          {notificationsOpen && (
            <div className="notice">
              {restaurants.length ? `${restaurants.length} restaurant${restaurants.length > 1 ? "s" : ""} enregistré${restaurants.length > 1 ? "s" : ""} sur la plateforme.` : "Aucune notification."}
              <button className="text-button" onClick={() => setNotificationsOpen(false)}>Fermer</button>
            </div>
          )}
          <section className="stats-grid" id="admin-dashboard" aria-label="Statistiques">
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <Store size={20} />
              </div>
              <div>
                <span>Restaurants au total</span>
                <strong>{restaurants.length}</strong>
                <small>
                  <ArrowUpRight size={13} /> 12% <em>vs mois dernier</em>
                </small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <Activity size={20} />
              </div>
              <div>
                <span>Restaurants actifs</span>
                <strong>{activeCount}</strong>
                <small>
                  <ArrowUpRight size={13} /> 8% <em>vs mois dernier</em>
                </small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-amber">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span>Restaurants suspendus</span>
                <strong>{suspendedCount}</strong>
                <small className="muted-stat">Mis à jour aujourd’hui</small>
              </div>
            </div>
          </section>
          <section className="restaurant-section" id="restaurants">
            <div className="section-heading">
              <div>
                <h2>Restaurants</h2>
                <p>Gérez les restaurants inscrits sur la plateforme.</p>
              </div>
              <button className="secondary-button" onClick={openAdd}>
                <Plus size={17} /> Nouveau restaurant
              </button>
            </div>
            <div className="toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder="Rechercher un restaurant..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="filter-tabs">
                <button
                  className={filter === "all" ? "filter-active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Tous <b>{restaurants.length}</b>
                </button>
                <button
                  className={filter === "active" ? "filter-active" : ""}
                  onClick={() => setFilter("active")}
                >
                  Actifs <b>{activeCount}</b>
                </button>
                <button
                  className={filter === "suspended" ? "filter-active" : ""}
                  onClick={() => setFilter("suspended")}
                >
                  Suspendus <b>{suspendedCount}</b>
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>RESTAURANT</th>
                    <th>CONTACT</th>
                    <th>ADRESSE</th>
                    <th>STATUT</th>
                    <th>INSCRIT LE</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6}>
                        <LoadingIndicator label="Chargement des restaurants..." />
                      </td>
                    </tr>
                  ) : visibleRestaurants.map((restaurant) => (
                    <tr key={restaurant.id}>
                      <td>
                        <div className="restaurant-name">
                          <div className="restaurant-logo">
                            {restaurant.name.slice(0, 1)}
                          </div>
                          <strong>{restaurant.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="contact-line">
                          <Phone size={14} /> {restaurant.phone}
                        </span>
                        <span className="email-line">{restaurant.email}</span>
                      </td>
                      <td>
                        <span className="contact-line">
                          <MapPin size={14} /> {restaurant.address}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill status-${restaurant.status}`}
                        >
                          {restaurant.status === "active"
                            ? "Actif"
                            : "Suspendu"}
                        </span>
                      </td>
                      <td className="date-cell">{restaurant.joined}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            onClick={() => openDetails(restaurant)}
                            aria-label={`Voir ${restaurant.name}`}
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            onClick={() => openEdit(restaurant)}
                            aria-label={`Modifier ${restaurant.name}`}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="danger-action"
                            onClick={() => deleteRestaurant(restaurant)}
                            aria-label={`Supprimer ${restaurant.name}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRestaurants.length === 0 && (
                <div className="empty-state">
                  Aucun restaurant ne correspond à votre recherche.
                </div>
              )}
            </div>
            <div className="table-footer">
              <span>
                Affichage de <strong>{visibleRestaurants.length}</strong>{" "}
                restaurant{visibleRestaurants.length > 1 ? "s" : ""}
              </span>
              <span className="sync-status">
                <Check size={14} /> Données synchronisées
              </span>
            </div>
          </section>
        </div>
      </section>
      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setModal(null)
          }
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">
                  {modal === "details"
                    ? "FICHE RESTAURANT"
                    : "GESTION RESTAURANT"}
                </div>
                <h2 id="modal-title">
                  {modal === "add"
                    ? "Ajouter un restaurant"
                    : modal === "edit"
                      ? "Modifier le restaurant"
                      : selected?.name}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setModal(null)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            {modal === "details" && selected ? (
              <div className="details-body">
                <div className="details-hero">
                  <div className="restaurant-logo large-logo">
                    {selected.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3>{selected.name}</h3>
                    <span className={`status-pill status-${selected.status}`}>
                      {selected.status === "active" ? "Actif" : "Suspendu"}
                    </span>
                  </div>
                </div>
                <div className="detail-list">
                  <div>
                    <span>Adresse</span>
                    <strong>{selected.address}</strong>
                  </div>
                  <div>
                    <span>Téléphone</span>
                    <strong>{selected.phone}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selected.email}</strong>
                  </div>
                  <div>
                    <span>Position</span>
                    <strong>{selected.position}</strong>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    onClick={() => toggleStatus(selected)}
                  >
                    {selected.status === "active" ? "Suspendre" : "Réactiver"}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil size={16} /> Modifier
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={saveRestaurant}>
                <div className="form-grid">
                  <label>
                    Nom du restaurant *
                    <input
                      required
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      placeholder="Ex. Chez Fatou"
                    />
                  </label>
                  <label>
                    Numéro de téléphone *
                    <input
                      required
                      value={form.phone}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                      placeholder="+221 77 000 00 00"
                    />
                  </label>
                  <label className="full-label">
                    Adresse *
                    <input
                      required
                      value={form.address}
                      onChange={(event) =>
                        setForm({ ...form, address: event.target.value })
                      }
                      placeholder="Quartier, ville"
                    />
                  </label>
                  <label>
                    Position sur la carte *
                    <input
                      required
                      value={form.position}
                      onChange={(event) =>
                        setForm({ ...form, position: event.target.value })
                      }
                      placeholder="Latitude, longitude"
                    />
                  </label>
                  <label>
                    Photo du restaurant
                    <input type="file" accept="image/*" />
                  </label>
                  <label>
                    Email *
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      placeholder="contact@restaurant.sn"
                    />
                  </label>
                  <label>
                    Mot de passe initial *
                    <input
                      required={modal === "add"}
                      type="password"
                      placeholder="••••••••"
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="primary-button">
                    {modal === "add"
                      ? "Ajouter le restaurant"
                      : "Enregistrer les changements"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
