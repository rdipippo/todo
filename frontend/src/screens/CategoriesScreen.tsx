import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoryService } from '../services/category.service';
import type { Category } from '../services/category.service';
import { Button, Alert, Spinner } from '../components';
import '../styles/categories.css';

export const CategoriesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const fetched = await categoryService.getCategories();
      setCategories(fetched);
    } catch {
      setError(t('categories.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      setAddLoading(true);
      setError('');
      setSuccess('');
      const created = await categoryService.createCategory({ name: trimmed, color: newColor });
      setCategories(prev => [...prev, created]);
      setNewName('');
      setNewColor('#6b7280');
      inputRef.current?.focus();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response?.status === 409) {
          setError(t('categories.duplicateError'));
          return;
        }
      }
      setError(t('categories.createError'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    try {
      setActionLoading(id);
      setError('');
      setSuccess('');
      const updated = await categoryService.updateCategory(id, { name: trimmed, color: editColor });
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
      setEditingId(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response?.status === 409) {
          setError(t('categories.duplicateError'));
          return;
        }
      }
      setError(t('categories.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('categories.confirmDelete'))) return;

    try {
      setActionLoading(id);
      setError('');
      setSuccess('');
      await categoryService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch {
      setError(t('categories.deleteError'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="screen screen-centered">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="categories-content">
        <div className="categories-header-row">
          <h2>{t('categories.title')}</h2>
          <button className="categories-back-link" onClick={() => navigate('/')}>
            {t('categories.backToHome')}
          </button>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="category-input-row">
          <input
            ref={inputRef}
            className="input"
            type="text"
            placeholder={t('categories.addPlaceholder')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={addLoading}
            maxLength={100}
          />
          <input
            type="color"
            className="category-color-input"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            disabled={addLoading}
            title={t('categories.color')}
          />
          <Button
            variant="primary"
            onClick={handleAdd}
            loading={addLoading}
            disabled={!newName.trim()}
          >
            {t('categories.addButton')}
          </Button>
        </div>

        <div className="category-list">
          {categories.length === 0 ? (
            <p className="category-empty">{t('categories.empty')}</p>
          ) : (
            categories.map(category => (
              <div key={category.id} className="category-item">
                {editingId === category.id ? (
                  <>
                    <div className="category-edit-form">
                      <input
                        type="color"
                        className="category-color-input"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        disabled={actionLoading === category.id}
                      />
                      <input
                        className="input"
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(category.id); }}
                        disabled={actionLoading === category.id}
                        maxLength={100}
                        autoFocus
                      />
                    </div>
                    <div className="category-actions">
                      <button
                        className="category-edit-btn"
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={actionLoading === category.id || !editName.trim()}
                      >
                        {actionLoading === category.id ? <Spinner size="sm" /> : t('categories.saveButton')}
                      </button>
                      <button
                        className="category-delete-btn"
                        onClick={cancelEdit}
                        disabled={actionLoading === category.id}
                      >
                        {t('categories.cancelButton')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className="category-color-dot"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="category-name">{category.name}</span>
                    <div className="category-actions">
                      <button
                        className="category-edit-btn"
                        onClick={() => startEdit(category)}
                        disabled={actionLoading === category.id}
                      >
                        {t('categories.editButton')}
                      </button>
                      <button
                        className="category-delete-btn"
                        onClick={() => handleDelete(category.id)}
                        disabled={actionLoading === category.id}
                      >
                        {actionLoading === category.id ? <Spinner size="sm" /> : t('categories.deleteButton')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesScreen;
