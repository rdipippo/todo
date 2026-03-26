import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { todoService } from '../services/todo.service';
import { categoryService } from '../services/category.service';
import type { Todo } from '../services/todo.service';
import type { Category } from '../services/category.service';
import { Button, Alert, Spinner, HamburgerMenu } from '../components';
import '../styles/home.css';

type FilterType = 'all' | 'active' | 'completed';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all' | 'uncategorized'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editPercentComplete, setEditPercentComplete] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [fetchedTodos, fetchedCategories] = await Promise.all([
        todoService.getTodos(),
        categoryService.getCategories(),
      ]);
      setTodos(fetchedTodos);
      setCategories(fetchedCategories);
    } catch {
      setError(t('todos.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      setAddLoading(true);
      setError('');
      const created = await todoService.createTodo({
        title: trimmed,
        category_id: newCategoryId || null,
      });
      setTodos(prev => [...prev, created]);
      setNewTitle('');
      inputRef.current?.focus();
    } catch {
      setError(t('todos.createError'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      setActionLoading(todo.id);
      setError('');
      const updated = await todoService.updateTodo(todo.id, { completed: !todo.completed });
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
    } catch {
      setError(t('todos.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (todoId: number) => {
    try {
      setActionLoading(todoId);
      setError('');
      await todoService.deleteTodo(todoId);
      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {
      setError(t('todos.deleteError'));
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditCategoryId(todo.category_id ?? '');
    setEditPercentComplete(todo.percent_complete);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditCategoryId('');
    setEditPercentComplete(0);
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    try {
      setActionLoading(id);
      setError('');
      const updated = await todoService.updateTodo(id, {
        title: trimmed,
        category_id: editCategoryId || null,
        percent_complete: editPercentComplete,
      });
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch {
      setError(t('todos.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  const isFiltered = filter !== 'all' || categoryFilter !== 'all';

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newTodos = [...todos];
    [newTodos[index - 1], newTodos[index]] = [newTodos[index], newTodos[index - 1]];
    setTodos(newTodos);
    try {
      await todoService.reorderTodos(newTodos.map(t => t.id));
    } catch {
      setError(t('todos.reorderError'));
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === todos.length - 1) return;
    const newTodos = [...todos];
    [newTodos[index], newTodos[index + 1]] = [newTodos[index + 1], newTodos[index]];
    setTodos(newTodos);
    try {
      await todoService.reorderTodos(newTodos.map(t => t.id));
    } catch {
      setError(t('todos.reorderError'));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getCategoryForTodo = (todo: Todo): Category | undefined => {
    return categories.find(c => c.id === todo.category_id);
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active' && todo.completed) return false;
    if (filter === 'completed' && !todo.completed) return false;
    if (categoryFilter === 'uncategorized' && todo.category_id !== null) return false;
    if (typeof categoryFilter === 'number' && todo.category_id !== categoryFilter) return false;
    return true;
  });

  const emptyKey =
    filter === 'active' ? 'todos.emptyActive' :
    filter === 'completed' ? 'todos.emptyCompleted' :
    'todos.emptyAll';

  if (!user) return null;

  if (loading) {
    return (
      <div className="screen screen-centered">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="home-header">
        <HamburgerMenu user={user} onLogout={handleLogout} />
      </div>

      <div className="home-content">
        {error && <Alert type="error">{error}</Alert>}

        <div className="todo-input-row">
          <input
            ref={inputRef}
            className="input"
            type="text"
            placeholder={t('todos.inputPlaceholder')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={addLoading}
            maxLength={500}
          />
          {categories.length > 0 && (
            <select
              className="input todo-category-select"
              value={newCategoryId}
              onChange={e => setNewCategoryId(e.target.value ? Number(e.target.value) : '')}
              disabled={addLoading}
            >
              <option value="">{t('categories.uncategorized')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
          <Button
            variant="primary"
            onClick={handleAdd}
            loading={addLoading}
            disabled={!newTitle.trim()}
          >
            {t('todos.addButton')}
          </Button>
        </div>

        <div className="todo-filters">
          {(['all', 'active', 'completed'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {t(`todos.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="todo-filters category-filters">
            <button
              className={`filter-tab${categoryFilter === 'all' ? ' active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              {t('categories.allCategories')}
            </button>
            <button
              className={`filter-tab${categoryFilter === 'uncategorized' ? ' active' : ''}`}
              onClick={() => setCategoryFilter('uncategorized')}
            >
              {t('categories.uncategorized')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`filter-tab${categoryFilter === cat.id ? ' active' : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                <span className="filter-category-dot" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <p className="todo-empty">{t(emptyKey)}</p>
          ) : (
            filteredTodos.map(todo => {
              const category = getCategoryForTodo(todo);
              const isEditing = editingId === todo.id;
              const todoIndex = todos.indexOf(todo);

              return (
                <div
                  key={todo.id}
                  className={`todo-item${todo.completed ? ' completed' : ''}${isEditing ? ' editing' : ''}`}
                >
                  {isEditing ? (
                    <div className="todo-edit-form">
                      <input
                        className="input todo-edit-title-input"
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(todo.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        disabled={actionLoading === todo.id}
                        maxLength={500}
                        autoFocus
                      />
                      <div className="todo-edit-bottom-row">
                        <div className="todo-percent-edit">
                          <input
                            type="range"
                            className="todo-percent-slider"
                            min={0}
                            max={100}
                            step={5}
                            value={editPercentComplete}
                            onChange={e => setEditPercentComplete(Number(e.target.value))}
                            disabled={actionLoading === todo.id}
                          />
                          <span className="todo-percent-label">{editPercentComplete}%</span>
                        </div>
                        {categories.length > 0 && (
                          <select
                            className="input todo-edit-category-select"
                            value={editCategoryId}
                            onChange={e => setEditCategoryId(e.target.value ? Number(e.target.value) : '')}
                            disabled={actionLoading === todo.id}
                          >
                            <option value="">{t('categories.uncategorized')}</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        )}
                        <div className="todo-edit-actions">
                          <button
                            className="todo-save-btn"
                            onClick={() => handleSaveEdit(todo.id)}
                            disabled={actionLoading === todo.id || !editTitle.trim()}
                          >
                            {actionLoading === todo.id ? <Spinner size="sm" /> : t('todos.saveButton')}
                          </button>
                          <button
                            className="todo-cancel-btn"
                            onClick={cancelEdit}
                            disabled={actionLoading === todo.id}
                          >
                            {t('todos.cancelButton')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="checkbox"
                        className="todo-checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggle(todo)}
                        disabled={actionLoading === todo.id}
                        aria-label={todo.title}
                      />
                      <div className="todo-content">
                        <span className={`todo-title${todo.completed ? ' strikethrough' : ''}`}>
                          {todo.title}
                        </span>
                        {category && (
                          <span
                            className="todo-category-badge"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        )}
                        <div className="todo-percent-bar-container" title={`${todo.percent_complete}%`}>
                          <div className="todo-percent-bar">
                            <div
                              className="todo-percent-bar-fill"
                              style={{ width: `${todo.percent_complete}%` }}
                            />
                          </div>
                          <span className="todo-percent-text">{todo.percent_complete}%</span>
                        </div>
                      </div>
                      {!isFiltered && (
                        <div className="todo-move-buttons">
                          <button
                            className="todo-move-btn"
                            onClick={() => handleMoveUp(todoIndex)}
                            disabled={actionLoading === todo.id || todoIndex === 0}
                            aria-label={t('todos.moveUp')}
                            title={t('todos.moveUp')}
                          >
                            {'\u25B2'}
                          </button>
                          <button
                            className="todo-move-btn"
                            onClick={() => handleMoveDown(todoIndex)}
                            disabled={actionLoading === todo.id || todoIndex === todos.length - 1}
                            aria-label={t('todos.moveDown')}
                            title={t('todos.moveDown')}
                          >
                            {'\u25BC'}
                          </button>
                        </div>
                      )}
                      <button
                        className="todo-edit-btn"
                        onClick={() => startEdit(todo)}
                        disabled={actionLoading === todo.id}
                        aria-label={t('todos.editButton')}
                        title={t('todos.editButton')}
                      >
                        {'\u270E'}
                      </button>
                      <button
                        className="todo-delete-btn"
                        onClick={() => handleDelete(todo.id)}
                        disabled={actionLoading === todo.id}
                        aria-label={t('todos.deleteButton')}
                        title={t('todos.deleteButton')}
                      >
                        {actionLoading === todo.id ? <Spinner size="sm" /> : '\u2715'}
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
