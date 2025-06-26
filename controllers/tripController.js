class TripController {
  bookTrip(req, res) {
    try {
      const { userId, carId, startDate, endDate, pickupLocation, dropoffLocation } = req.body;
      
      if (!userId || !carId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tripId = Date.now().toString(); 
      const trip = {
        id: tripId,
        userId,
        carId,
        startDate,
        endDate,
        pickupLocation,
        dropoffLocation,
        status: 'confirmed',
        createdAt: new Date()
      };

      res.status(201).json({ message: 'Trip booked successfully', trip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to book trip' });
    }
  }

  getTripDetails(req, res) {
    try {
      const { id } = req.params;
      
      const trip = {
        id,
        userId: 'user123',
        carId: 'car456',
        startDate: '2024-06-10',
        endDate: '2024-06-15',
        pickupLocation: 'Airport',
        dropoffLocation: 'Hotel',
        status: 'confirmed',
        totalCost: 250.00
      };

      res.json({ trip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trip details' });
    }
  }

  updateTrip(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedTrip = {
        id,
        ...updates,
        updatedAt: new Date()
      };

      res.json({ message: 'Trip updated successfully', trip: updatedTrip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update trip' });
    }
  }

  cancelTrip(req, res) {
    try {
      const { id } = req.params;
      res.json({ 
        message: 'Trip cancelled successfully', 
        tripId: id,
        status: 'cancelled',
        cancelledAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel trip' });
    }
  }
}

module.exports = TripController;