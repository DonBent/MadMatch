const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

export const tilbudService = {
  async getAllTilbud(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.butik) params.append('butik', filters.butik);
      if (filters.kategori) params.append('kategori', filters.kategori);
      
      const url = `${API_BASE_URL}/tilbud${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching tilbud:', error);
      throw error;
    }
  },

  async getTilbudById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/tilbud/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching tilbud by id:', error);
      throw error;
    }
  },

  async getButikker() {
    try {
      const response = await fetch(`${API_BASE_URL}/butikker`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching butikker:', error);
      throw error;
    }
  },

  async getKategorier() {
    try {
      const response = await fetch(`${API_BASE_URL}/kategorier`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching kategorier:', error);
      throw error;
    }
  }
};
