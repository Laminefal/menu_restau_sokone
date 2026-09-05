import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Restaurant = {
  id: number;
  name: string;
  status: 'Ouvert' | 'Fermé';
  featured_dish: string;
  tag: string;
};

const fallbackRestaurants: Restaurant[] = [
  {
    id: 1,
    name: 'Restaurant Samba',
    status: 'Ouvert',
    featured_dish: 'Fromage + riz',
    tag: 'Aujourd’hui',
  },
  {
    id: 2,
    name: 'Le Petit Délice',
    status: 'Ouvert',
    featured_dish: 'Thieboudienne',
    tag: 'Menu du jour',
  },
  {
    id: 3,
    name: 'Nour Chez Ali',
    status: 'Fermé',
    featured_dish: 'Poisson grillé',
    tag: 'Bientôt',
  },
];

function App() {
  const [restaurants, setRestaurants] =
    useState<Restaurant[]>(fallbackRestaurants);

  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurants = async () => {
      if (supabase === null) {
        setIsLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('restaurants')
        .select('id, name, status, featured_dish, tag')
        .order('created_at', { ascending: true });

      if (queryError) {
        setError(
          'Les données Supabase sont indisponibles pour le moment.'
        );
      } else if (data) {
        setRestaurants(data as Restaurant[]);
      }

      setIsLoading(false);
    };

    void loadRestaurants();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        <header className="mb-10 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-500 p-8 text-white shadow-lg">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-emerald-100">
            Menu Sokone
          </p>

          <h1 className="text-3xl font-bold sm:text-5xl">
            Découvrez les meilleurs restaurants de Sokone
          </h1>

          <p className="mt-4 max-w-2xl text-base text-emerald-50 sm:text-lg">
            Consultez les restaurants actifs, découvrez leur menu du jour
            et trouvez le bon repas à proximité.
          </p>
        </header>

        {isLoading && (
          <p className="mb-6 text-sm text-slate-500">
            Chargement des restaurants...
          </p>
        )}

        {error && (
          <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </p>
        )}

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((restaurant) => (
            <article
              key={restaurant.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="h-44 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200" />

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {restaurant.name}
                  </h2>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      restaurant.status === 'Ouvert'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {restaurant.status}
                  </span>
                </div>

                <p className="mb-4 text-sm text-slate-600">
                  {restaurant.tag} · Plat phare :{' '}
                  {restaurant.featured_dish}
                </p>

                <button className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
                  Voir le restaurant
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default App;