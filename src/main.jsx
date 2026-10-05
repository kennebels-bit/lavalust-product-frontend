import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')
)
  .replace(/\/+$/, '');
const ACCESS_TOKEN_KEY = 'product-desk-access-token';
const REFRESH_TOKEN_KEY = 'product-desk-refresh-token';
const USER_KEY = 'product-desk-user';

let refreshRequest;

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function saveSession(tokens, user) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function refreshSession() {
  if (refreshRequest) return refreshRequest;

  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('Your session expired. Please log in again.');

  refreshRequest = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(parseResponse)
    .then(({ tokens }) => {
      if (!tokens?.access_token || !tokens?.refresh_token) {
        throw new Error('The API returned an invalid refresh response.');
      }
      sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    })
    .catch((error) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshRequest = undefined;
    });

  return refreshRequest;
}

async function apiRequest(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && getAccessToken()) headers.Authorization = `Bearer ${getAccessToken()}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retry && sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
    await refreshSession();
    return apiRequest(path, { method, body, auth, retry: false });
  }

  return parseResponse(response);
}

function ProductForm({ product, onSave, onCancel, busy }) {
  const [values, setValues] = useState({
    product_name: product?.product_name || '',
    description: product?.description || '',
    price: product?.price ?? '',
    quantity: product?.quantity ?? 0,
  });

  useEffect(() => {
    setValues({
      product_name: product?.product_name || '',
      description: product?.description || '',
      price: product?.price ?? '',
      quantity: product?.quantity ?? 0,
    });
  }, [product]);

  function update(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      ...values,
      price: String(values.price),
      quantity: Number(values.quantity),
    });
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{product ? 'UPDATE INVENTORY' : 'NEW INVENTORY'}</p>
          <h2>{product ? 'Edit product' : 'Add a product'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form">×</button>
      </div>
      <label>
        Product name
        <input
          name="product_name"
          value={values.product_name}
          onChange={update}
          maxLength="100"
          placeholder="e.g. Studio headphones"
          required
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={values.description}
          onChange={update}
          rows="3"
          maxLength="65535"
          placeholder="What makes this product special?"
        />
      </label>
      <div className="field-row">
        <label>
          Price
          <div className="input-prefix">
            <span>₱</span>
            <input
              name="price"
              type="number"
              value={values.price}
              onChange={update}
              min="0"
              max="99999999.99"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            value={values.quantity}
            onChange={update}
            min="0"
            max="2147483647"
            step="1"
            required
          />
        </label>
      </div>
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : product ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}

function Login({ onLogin, onRegister, busy, error }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    if (isRegistering) {
      onRegister({ username, email, password });
    } else {
      onLogin(identifier, password);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">P</div>
        <p className="eyebrow">LAVALUST INVENTORY</p>
        <h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegistering
            ? 'Create a read-only account to view products. Only kenne has administrator access.'
            : 'Sign in to view products. Only kenne can manage the catalog.'}
        </p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form onSubmit={submit} className="login-form">
          {isRegistering ? (
            <>
              <label>
                Username
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength="3"
                  maxLength="50"
                  pattern="[A-Za-z0-9_.\\-]+"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength="255"
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Username or email
              <input
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegistering ? 12 : undefined}
              maxLength={isRegistering ? 72 : undefined}
              required
            />
          </label>
          <button className="button button-primary button-wide" disabled={busy}>
            {busy ? (isRegistering ? 'Creating account…' : 'Signing in…') : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button
          className="auth-switch"
          type="button"
          onClick={() => { setIsRegistering((current) => !current); }}
        >
          {isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </section>
      <p className="login-footnote">Secure access · Your inventory, in one place</p>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    } catch {
      clearSession();
      return null;
    }
  });
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/products');
      setProducts(response.data || []);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401 || !getAccessToken()) {
        clearSession();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && getAccessToken()) loadProducts();
  }, [user, loadProducts]);

  async function login(identifier, password) {
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier, password },
        auth: false,
        retry: false,
      });
      saveSession(response.tokens, response.user);
      setUser(response.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function registerAccount(credentials) {
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: credentials,
        auth: false,
        retry: false,
      });
      saveSession(response.tokens, response.user);
      setUser(response.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(values) {
    setBusy(true);
    setError('');
    try {
      const editing = Boolean(activeProduct);
      await apiRequest(editing ? `/products/${activeProduct.id}` : '/products', {
        method: editing ? 'PUT' : 'POST',
        body: values,
      });
      setShowForm(false);
      setActiveProduct(null);
      setNotice(editing ? 'Product updated.' : 'Product added.');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.product_name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await apiRequest(`/products/${product.id}`, { method: 'DELETE' });
      setNotice('Product deleted.');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function logout() {
    setError('');
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refresh_token: sessionStorage.getItem(REFRESH_TOKEN_KEY) },
        retry: false,
      });
      setNotice('You have been logged out.');
    } catch (requestError) {
      setError(`Signed out locally. The server could not revoke the refresh token: ${requestError.message}`);
    } finally {
      clearSession();
      setUser(null);
      setProducts([]);
      setShowForm(false);
      setActiveProduct(null);
    }
  }

  if (!user || !getAccessToken()) {
    return <Login onLogin={login} onRegister={registerAccount} busy={busy} error={error} />;
  }

  const visibleProducts = products.filter((product) => (
    `${product.product_name} ${product.description || ''}`.toLowerCase().includes(search.toLowerCase())
  ));
  const totalValue = products.reduce(
    (sum, product) => sum + Number(product.price) * Number(product.quantity),
    0,
  );
  const isAdmin = user.role === 'admin';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Product Desk home">
          <span className="brand-mark brand-mark-small">P</span>
          <span>product<span className="brand-accent">desk</span></span>
        </a>
        <div className="account">
          <div className="account-copy">
            <strong>{user.username}</strong>
            <span>{isAdmin ? 'Administrator' : 'Read-only access'}</span>
          </div>
          <button className="button button-quiet" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="dashboard">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Your inventory</h1>
            <p className="muted">Keep your products organized and up to date.</p>
          </div>
          {isAdmin && (
            <button
              className="button button-primary"
              onClick={() => { setActiveProduct(null); setShowForm(true); setError(''); }}
            >
              <span aria-hidden="true">＋</span> Add product
            </button>
          )}
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}

        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon icon-violet">▦</span>
            <div><span className="stat-label">Total products</span><strong>{products.length}</strong></div>
          </article>
          <article className="stat-card">
            <span className="stat-icon icon-mint">↗</span>
            <div><span className="stat-label">Units in stock</span><strong>{products.reduce((sum, item) => sum + Number(item.quantity), 0)}</strong></div>
          </article>
          <article className="stat-card">
            <span className="stat-icon icon-amber">₱</span>
            <div><span className="stat-label">Inventory value</span><strong>₱{totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
          </article>
        </div>

        <section className="catalog-card">
          <div className="catalog-heading">
            <div><h2>Product catalog</h2><p className="muted">{products.length} items in your inventory</p></div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" />
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Price</th><th>Quantity</th><th>Created</th>
                  {isAdmin && <th><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="empty-state">Loading your products…</td></tr>
                ) : visibleProducts.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="empty-state">{search ? 'No products match your search.' : isAdmin ? 'No products yet. Add your first product to get started.' : 'No products have been added yet.'}</td></tr>
                ) : visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <span className="product-avatar">{product.product_name.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{product.product_name}</strong><span>{product.description || 'No description'}</span></div>
                      </div>
                    </td>
                    <td className="price-cell">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className={`quantity-pill ${Number(product.quantity) === 0 ? 'quantity-empty' : ''}`}>{product.quantity} in stock</span></td>
                    <td>{product.created_at ? new Date(product.created_at.replace(' ', 'T')).toLocaleDateString() : '—'}</td>
                    {isAdmin && (
                      <td>
                        <div className="row-actions">
                          <button className="action-button" onClick={() => { setActiveProduct(product); setShowForm(true); setError(''); }}>Edit</button>
                          <button className="action-button action-danger" onClick={() => deleteProduct(product)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) { setShowForm(false); setActiveProduct(null); }
        }}>
          <ProductForm
            product={activeProduct}
            onSave={saveProduct}
            onCancel={() => { setShowForm(false); setActiveProduct(null); }}
            busy={busy}
          />
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
