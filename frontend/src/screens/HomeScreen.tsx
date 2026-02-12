import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { todoService } from '../services/todo.service';
import type { Todo } from '../services/todo.service';
import { Button, Alert, Spinner, HamburgerMenu } from '../components';
import '../styles/home.css';

type FilterType = 'all' | 'active' | 'completed';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      setError('');
      const fetched = await todoService.getTodos();
      setTodos(fetched);
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
      const created = await todoService.createTodo({ title: trimmed });
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
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

        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <p className="todo-empty">{t(emptyKey)}</p>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`todo-item${todo.completed ? ' completed' : ''}`}
              >
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                  disabled={actionLoading === todo.id}
                  aria-label={todo.title}
                />
                <span className={`todo-title${todo.completed ? ' strikethrough' : ''}`}>
                  {todo.title}
                </span>
                <button
                  className="todo-delete-btn"
                  onClick={() => handleDelete(todo.id)}
                  disabled={actionLoading === todo.id}
                  aria-label={t('todos.deleteButton')}
                  title={t('todos.deleteButton')}
                >
                  {actionLoading === todo.id ? <Spinner size="sm" /> : '\u2715'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
